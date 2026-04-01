/* ============================================================
   長襦袢セルフ判定 - Cloudflare Pages Worker
   - POST /api/log                  : 診断ログ保存
   - POST /api/fabric-check         : 生地チェッカー AI判定＋R2保存＋D1ログ
   - GET  /api/fabric-image/:key    : R2画像取得
   - GET  /hibikinu                 : 管理画面（ログイン）
   - POST /hibikinu/login           : 認証
   - GET  /hibikinu/data            : ログ一覧JSON（認証済み）
   - GET  /hibikinu/stats           : 統計JSON（認証済み）
   - POST /hibikinu/delete          : ログ削除（認証済み）
   - POST /hibikinu/flag            : テストフラグ切り替え（認証済み）
   - GET  /hibikinu/fabric-data     : 生地ログ一覧JSON（認証済み）
   - GET  /hibikinu/fabric-stats    : 生地統計JSON（認証済み）
   - POST /hibikinu/fabric-delete   : 生地ログ削除（認証済み）
   - POST /hibikinu/fabric-flag     : 生地ログ テストフラグ切替（認証済み）
   ============================================================ */

const ADMIN_PASSWORD = 'Hibikinukosan_checker';
const ADMIN_TOKEN_KEY = 'hibikinu_token';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ── API: ログ保存 ──────────────────────────────
    if (path === '/api/log' && request.method === 'POST') {
      return handleSaveLog(request, env);
    }

    // ── API: 生地チェッカー AI判定 ─────────────────
    if (path === '/api/fabric-check' && request.method === 'POST') {
      return handleFabricCheck(request, env);
    }

    // ── API: R2画像取得 ────────────────────────────
    if (path.startsWith('/api/fabric-image/') && request.method === 'GET') {
      return handleFabricImage(request, env, path);
    }

    // ── 管理画面ルート ──────────────────────────────
    if (path === '/hibikinu' || path === '/hibikinu/') {
      return renderAdminLogin();
    }
    if (path === '/hibikinu/login' && request.method === 'POST') {
      return handleAdminLogin(request);
    }
    if (path === '/hibikinu/data' && request.method === 'GET') {
      return handleAdminData(request, env, url);
    }
    if (path === '/hibikinu/stats' && request.method === 'GET') {
      return handleAdminStats(request, env);
    }
    if (path === '/hibikinu/delete' && request.method === 'POST') {
      return handleAdminDelete(request, env);
    }
    if (path === '/hibikinu/flag' && request.method === 'POST') {
      return handleAdminFlag(request, env);
    }
    if (path === '/hibikinu/export' && request.method === 'GET') {
      return handleAdminExport(request, env);
    }
    if (path === '/hibikinu/fabric-data' && request.method === 'GET') {
      return handleFabricAdminData(request, env, url);
    }
    if (path === '/hibikinu/fabric-stats' && request.method === 'GET') {
      return handleFabricAdminStats(request, env);
    }
    if (path === '/hibikinu/fabric-delete' && request.method === 'POST') {
      return handleFabricAdminDelete(request, env);
    }
    if (path === '/hibikinu/fabric-flag' && request.method === 'POST') {
      return handleFabricAdminFlag(request, env);
    }
    if (path.startsWith('/hibikinu/')) {
      return renderAdminApp(request, env, url);
    }

    // ── 静的ファイルはデフォルトのPages処理へ ──────
    return env.ASSETS.fetch(request);
  }
};

/* ============================================================
   デバイス情報ヘルパー
   ============================================================ */

// IPアドレスをSHA-256でハッシュ化（元IPは復元不可）
async function hashIP(ip) {
  if (!ip) return null;
  const data = new TextEncoder().encode(ip + '_kinuko_salt');
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('').slice(0, 16);
}

// User-Agentを「OS + ブラウザ」の簡易ラベルに変換
function parseDevice(ua) {
  if (!ua) return 'unknown';
  const u = ua.toLowerCase();
  // OS判定
  let os = 'PC';
  if (u.includes('iphone'))       os = 'iPhone';
  else if (u.includes('ipad'))    os = 'iPad';
  else if (u.includes('android')) os = 'Android';
  // ブラウザ判定
  let br = 'Other';
  if (u.includes('edg/'))                          br = 'Edge';
  else if (u.includes('chrome') && !u.includes('chromium')) br = 'Chrome';
  else if (u.includes('safari') && !u.includes('chrome'))   br = 'Safari';
  else if (u.includes('firefox'))                  br = 'Firefox';
  return `${os} ${br}`;
}

/* ============================================================
   認証ヘルパー
   ============================================================ */
function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function checkAuth(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/hibikinu_token=([a-f0-9]+)/);
  if (!match) return false;
  // シンプルなトークン検証（本番はKVで管理するとより安全）
  return match[1].length === 48;
}

/* ============================================================
   API: 生地チェッカー Gemini判定
   ============================================================ */
async function handleFabricCheck(request, env) {
  try {
    const { images, nickname } = await request.json();
    if (!images || images.length !== 3) {
      return Response.json({ error: '画像が3枚必要です' }, { status: 400 });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'APIキーが設定されていません' }, { status: 500 });
    }

    // base64からdata:image/jpeg;base64, を除去
    const parts = images.map((img) => {
      const base64 = img.replace(/^data:image\/\w+;base64,/, '');
      return { inlineData: { mimeType: 'image/jpeg', data: base64 } };
    });

    const prompt = `あなたは和服の生地の専門家です。
添付された長襦袢の写真3枚（全体像・光沢角度・生地アップ）を見て、素材と生地の種類を判定してください。

【判定ルール1：素材カテゴリ】
必ず以下の中から1つ選んでください：
- silk（絹・シルク）
- cotton（綿・コットン）
- linen（麻・リネン）
- poly（ポリエステル・化繊）
- other（その他・不明）

【判定ルール2：生地の種類】
以下のリストを参照し、明確に該当するものがあれば fabricKey にそのキーを返してください。
- chirimen（ちりめん：縦・横方向に細かいシボ（凹凸）がある・マットで光沢が少ない・独特のざらつき感がある）
- rinzu（綸子：光沢があり地紋（織り柄）が見える・シボはなくなめらか）
- habutae（羽二重：平織りで非常になめらか・上品な光沢がある・薄手で軽い・シボや地紋はない・ちりめんや綸子より薄くドレープ性が高い）
- ro（絽・紗：透け感がある夏物・格子状または横縞状の透け目が見える）
- seika（精華パレス：ちりめんの一種だがシボが非常に小さく浅い・ちりめんより平滑に近く見える・光沢があり薄手・パレス縮緬とも呼ばれる）
- shioze（塩瀬：横畝（横方向の凹凸）がはっきりある・厚手でしっかりした生地感・光沢はやや抑えめ）
- smooth（一般的な平織り・上記のいずれの特徴も明確でない）

リストのいずれにも明確に該当しないが、最も近い候補があると判断した場合は：
  fabricKey に "closest_match" を返し、
  closestFabricKey にそのキーを、
  closestReason にその理由を400字前後で日本語で記入してください。

全く判断できない場合のみ fabricKey に "unknown" を返してください。

【出力形式】必ずJSON形式のみで返してください。余計な文章は不要です。
{
  "materialKey": "素材カテゴリのキー",
  "fabricKey": "生地種類のキー または closest_match または unknown",
  "confidence": "high または mid または low",
  "comment": "判定根拠を400字前後で日本語で説明。生地の特徴（光沢・シボ・織り目・透け感など）を具体的に述べ、判定の根拠と注意点も含めること",
  "closestFabricKey": "closest_match時のみ記入。それ以外はnull",
  "closestReason": "closest_match時のみ記入。それ以外はnull"
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              ...parts,
              { text: prompt }
            ]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', errText);
      return Response.json({ error: 'AI判定に失敗しました。しばらくしてから再度お試しください。' }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // JSONパース失敗時はunknownとして返す
      parsed = { fabricKey: 'unknown', confidence: 'low', comment: '写真からの判定が難しい状態でした。別の角度で撮り直してみてください。' };
    }

    // 想定外のキーを補正
    const VALID_FABRIC   = ['chirimen','rinzu','habutae','ro','seika','shioze','smooth','unknown','closest_match'];
    const VALID_MATERIAL = ['silk','cotton','linen','poly','other'];
    if (!VALID_FABRIC.includes(parsed.fabricKey))     parsed.fabricKey   = 'unknown';
    if (!VALID_MATERIAL.includes(parsed.materialKey)) parsed.materialKey = 'other';

    // closest_match のとき closestFabricKey が有効か確認
    const VALID_CLOSEST = ['chirimen','rinzu','habutae','ro','seika','shioze','smooth'];
    if (parsed.fabricKey === 'closest_match') {
      if (!VALID_CLOSEST.includes(parsed.closestFabricKey)) {
        parsed.fabricKey = 'unknown';
        parsed.closestFabricKey = null;
        parsed.closestReason    = null;
      }
    } else {
      parsed.closestFabricKey = null;
      parsed.closestReason    = null;
    }

    // ── R2に画像を保存 ────────────────────────────────
    const imageUrls = [null, null, null];
    if (env.kinuko_fabric_images) {
      const ts = Date.now();
      for (let i = 0; i < 3; i++) {
        try {
          const base64 = images[i].replace(/^data:image\/\w+;base64,/, '');
          const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          const key = `fabric/${ts}_${i + 1}.jpg`;
          await env.kinuko_fabric_images.put(key, binary, {
            httpMetadata: { contentType: 'image/jpeg' }
          });
          imageUrls[i] = key;
        } catch (e) {
          console.error(`R2 upload error (image ${i+1}):`, e);
        }
      }
    }

    // ── D1にログを保存 ────────────────────────────────
    if (env.kinuko_logs) {
      try {
        await env.kinuko_logs.prepare(`
          INSERT INTO fabric_logs
            (nickname, material_key, fabric_key, closest_fabric_key,
             confidence, comment, closest_reason,
             image_url_1, image_url_2, image_url_3, is_test)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).bind(
          nickname || null,
          parsed.materialKey,
          parsed.fabricKey,
          parsed.closestFabricKey || null,
          parsed.confidence,
          parsed.comment,
          parsed.closestReason || null,
          imageUrls[0], imageUrls[1], imageUrls[2]
        ).run();
      } catch (e) {
        console.error('D1 log error:', e);
      }
    }

    return Response.json(parsed);

  } catch (e) {
    console.error('handleFabricCheck error:', e);
    return Response.json({ error: '予期しないエラーが発生しました' }, { status: 500 });
  }
}

/* ============================================================
   API: R2画像取得
   ============================================================ */
async function handleFabricImage(request, env, path) {
  const key = decodeURIComponent(path.replace('/api/fabric-image/', ''));
  if (!env.kinuko_fabric_images) {
    return new Response('R2 not configured', { status: 500 });
  }
  const obj = await env.kinuko_fabric_images.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'max-age=86400' }
  });
}

/* ============================================================
   管理API: 生地ログ一覧
   ============================================================ */
async function handleFabricAdminData(request, env, url) {
  if (!checkAuth(request)) return new Response('Unauthorized', { status: 401 });

  const showTest = url.searchParams.get('test') === '1';
  const limit    = parseInt(url.searchParams.get('limit') || '100');
  const offset   = parseInt(url.searchParams.get('offset') || '0');

  const rows = await env.kinuko_logs.prepare(`
    SELECT * FROM fabric_logs
    WHERE is_test = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(showTest ? 1 : 0, limit, offset).all();

  const total = await env.kinuko_logs.prepare(
    `SELECT COUNT(*) as cnt FROM fabric_logs WHERE is_test = ?`
  ).bind(showTest ? 1 : 0).first();

  return Response.json({ rows: rows.results, total: total?.cnt || 0 });
}

/* ============================================================
   管理API: 生地統計
   ============================================================ */
async function handleFabricAdminStats(request, env) {
  if (!checkAuth(request)) return new Response('Unauthorized', { status: 401 });

  const [total, fabricDist, materialDist, confDist, daily] = await Promise.all([
    env.kinuko_logs.prepare(`SELECT COUNT(*) as cnt FROM fabric_logs WHERE is_test = 0`).first(),
    env.kinuko_logs.prepare(`
      SELECT fabric_key, COUNT(*) as cnt FROM fabric_logs
      WHERE is_test = 0 GROUP BY fabric_key ORDER BY cnt DESC`).all(),
    env.kinuko_logs.prepare(`
      SELECT material_key, COUNT(*) as cnt FROM fabric_logs
      WHERE is_test = 0 GROUP BY material_key ORDER BY cnt DESC`).all(),
    env.kinuko_logs.prepare(`
      SELECT confidence, COUNT(*) as cnt FROM fabric_logs
      WHERE is_test = 0 GROUP BY confidence`).all(),
    env.kinuko_logs.prepare(`
      SELECT DATE(created_at) as day, COUNT(*) as cnt FROM fabric_logs
      WHERE is_test = 0 GROUP BY day ORDER BY day DESC LIMIT 30`).all(),
  ]);

  return Response.json({
    total: total?.cnt || 0,
    fabricDist: fabricDist.results,
    materialDist: materialDist.results,
    confDist: confDist.results,
    daily: daily.results,
  });
}

/* ============================================================
   管理API: 生地ログ削除
   ============================================================ */
async function handleFabricAdminDelete(request, env) {
  if (!checkAuth(request)) return new Response('Unauthorized', { status: 401 });
  const { id } = await request.json();
  await env.kinuko_logs.prepare(`DELETE FROM fabric_logs WHERE id = ?`).bind(id).run();
  return Response.json({ success: true });
}

/* ============================================================
   管理API: 生地ログ テストフラグ切り替え
   ============================================================ */
async function handleFabricAdminFlag(request, env) {
  if (!checkAuth(request)) return new Response('Unauthorized', { status: 401 });
  const { id, is_test } = await request.json();
  await env.kinuko_logs.prepare(`UPDATE fabric_logs SET is_test = ? WHERE id = ?`).bind(is_test, id).run();
  return Response.json({ success: true });
}

/* ============================================================
   API: ログ保存
   ============================================================ */
async function handleSaveLog(request, env) {
  try {
    const body = await request.json();
    const {
      grade, score, duration_sec, session_id,
      ans_material, ans_silk_fabric, ans_fabric,
      ans_tailoring, ans_decoration, ans_water_history,
      ans_past_result, ans_color,
      ans_option_guard, ans_option_vintage
    } = body;

    const referrer = request.headers.get('Referer') || '';
    const ua       = request.headers.get('User-Agent') || '';
    const ip       = request.headers.get('CF-Connecting-IP') ||
                     request.headers.get('X-Forwarded-For')?.split(',')[0].trim() || '';

    const ip_hash = await hashIP(ip);
    const device  = parseDevice(ua);

    await env.kinuko_logs.prepare(`
      INSERT INTO diagnosis_logs
        (grade, score, duration_sec, session_id, referrer,
         ans_material, ans_silk_fabric, ans_fabric,
         ans_tailoring, ans_decoration, ans_water_history,
         ans_past_result, ans_color,
         ans_option_guard, ans_option_vintage,
         ip_hash, device)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      grade, score, duration_sec || null, session_id || null, referrer,
      ans_material || null, ans_silk_fabric || null, ans_fabric || null,
      ans_tailoring || null, ans_decoration || null, ans_water_history || null,
      ans_past_result || null, ans_color || null,
      ans_option_guard ? 1 : 0, ans_option_vintage ? 1 : 0,
      ip_hash || null, device || null
    ).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/* ============================================================
   管理画面: ログイン処理
   ============================================================ */
async function handleAdminLogin(request) {
  const body = await request.formData();
  const password = body.get('password');
  if (password !== ADMIN_PASSWORD) {
    return renderAdminLogin('パスワードが違います');
  }
  const token = generateToken();
  return new Response('', {
    status: 302,
    headers: {
      'Location': '/hibikinu/dashboard',
      'Set-Cookie': `hibikinu_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
    }
  });
}

/* ============================================================
   管理画面: ログ一覧JSON
   ============================================================ */
async function handleAdminData(request, env, url) {
  if (!checkAuth(request)) return new Response('Unauthorized', { status: 401 });

  const page    = parseInt(url.searchParams.get('page')  || '1');
  const grade   = url.searchParams.get('grade')  || '';
  const isTest  = url.searchParams.get('test')   || '';
  const perPage = 50;
  const offset  = (page - 1) * perPage;

  let where = [];
  let params = [];
  if (grade)  { where.push('grade = ?');   params.push(grade); }
  if (isTest !== '') { where.push('is_test = ?'); params.push(parseInt(isTest)); }

  const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = await env.kinuko_logs.prepare(
    `SELECT COUNT(*) as cnt FROM diagnosis_logs ${whereSQL}`
  ).bind(...params).first();

  const rows = await env.kinuko_logs.prepare(
    `SELECT * FROM diagnosis_logs ${whereSQL} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, perPage, offset).all();

  // ip_hashごとの総件数を取得（重複判別用）
  const ipCounts = {};
  const hashes = [...new Set(rows.results.map(r => r.ip_hash).filter(Boolean))];
  if (hashes.length > 0) {
    const ph = hashes.map(() => '?').join(',');
    const ipRows = await env.kinuko_logs.prepare(
      `SELECT ip_hash, COUNT(*) as cnt FROM diagnosis_logs WHERE ip_hash IN (${ph}) GROUP BY ip_hash`
    ).bind(...hashes).all();
    ipRows.results.forEach(r => { ipCounts[r.ip_hash] = r.cnt; });
  }

  return new Response(JSON.stringify({ rows: rows.results, total: total.cnt, page, perPage, ipCounts }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/* ============================================================
   管理画面: 統計JSON
   ============================================================ */
async function handleAdminStats(request, env) {
  if (!checkAuth(request)) return new Response('Unauthorized', { status: 401 });

  const [gradeCount, daily, materialDist, fabricDist, tailoringDist, waterHistoryDist, colorDist, totalRow, optionRow] = await Promise.all([
    env.kinuko_logs.prepare(
      `SELECT grade, COUNT(*) as cnt FROM diagnosis_logs WHERE is_test=0 GROUP BY grade`
    ).all(),
    env.kinuko_logs.prepare(
      `SELECT date(created_at, '+9 hours') as day, COUNT(*) as cnt FROM diagnosis_logs WHERE is_test=0 GROUP BY day ORDER BY day DESC LIMIT 30`
    ).all(),
    env.kinuko_logs.prepare(
      `SELECT ans_material, COUNT(*) as cnt FROM diagnosis_logs WHERE is_test=0 GROUP BY ans_material`
    ).all(),
    env.kinuko_logs.prepare(
      `SELECT COALESCE(ans_silk_fabric, ans_fabric) as fabric_key, COUNT(*) as cnt FROM diagnosis_logs WHERE is_test=0 AND (ans_silk_fabric IS NOT NULL OR ans_fabric IS NOT NULL) GROUP BY fabric_key`
    ).all(),
    env.kinuko_logs.prepare(
      `SELECT ans_tailoring, COUNT(*) as cnt FROM diagnosis_logs WHERE is_test=0 AND ans_tailoring IS NOT NULL GROUP BY ans_tailoring`
    ).all(),
    env.kinuko_logs.prepare(
      `SELECT ans_water_history, COUNT(*) as cnt FROM diagnosis_logs WHERE is_test=0 AND ans_water_history IS NOT NULL GROUP BY ans_water_history`
    ).all(),
    env.kinuko_logs.prepare(
      `SELECT ans_color, COUNT(*) as cnt FROM diagnosis_logs WHERE is_test=0 AND ans_color IS NOT NULL GROUP BY ans_color`
    ).all(),
    env.kinuko_logs.prepare(
      `SELECT COUNT(*) as cnt, AVG(score) as avg_score FROM diagnosis_logs WHERE is_test=0`
    ).first(),
    env.kinuko_logs.prepare(
      `SELECT SUM(ans_option_guard) as guard_cnt, SUM(ans_option_vintage) as vintage_cnt FROM diagnosis_logs WHERE is_test=0`
    ).first()
  ]);

  return new Response(JSON.stringify({
    gradeCount: gradeCount.results,
    daily: daily.results,
    materialDist: materialDist.results,
    fabricDist: fabricDist.results,
    tailoringDist: tailoringDist.results,
    waterHistoryDist: waterHistoryDist.results,
    colorDist: colorDist.results,
    total: totalRow.cnt,
    avgScore: Math.round((totalRow.avg_score || 0) * 10) / 10,
    guardCnt: optionRow.guard_cnt || 0,
    vintageCnt: optionRow.vintage_cnt || 0
  }), { headers: { 'Content-Type': 'application/json' } });
}

/* ============================================================
   管理画面: 削除
   ============================================================ */
async function handleAdminDelete(request, env) {
  if (!checkAuth(request)) return new Response('Unauthorized', { status: 401 });
  const body = await request.json();
  const { ids, deleteTestAll } = body;

  if (deleteTestAll) {
    await env.kinuko_logs.prepare(`DELETE FROM diagnosis_logs WHERE is_test = 1`).run();
  } else if (ids && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    await env.kinuko_logs.prepare(
      `DELETE FROM diagnosis_logs WHERE id IN (${placeholders})`
    ).bind(...ids).run();
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

/* ============================================================
   管理画面: テストフラグ切り替え
   ============================================================ */
async function handleAdminFlag(request, env) {
  if (!checkAuth(request)) return new Response('Unauthorized', { status: 401 });
  const { id, is_test } = await request.json();
  await env.kinuko_logs.prepare(
    `UPDATE diagnosis_logs SET is_test = ? WHERE id = ?`
  ).bind(is_test ? 1 : 0, id).run();
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

/* ============================================================
   管理画面: CSVエクスポート
   ============================================================ */
async function handleAdminExport(request, env) {
  if (!checkAuth(request)) return new Response('Unauthorized', { status: 401 });
  const rows = await env.kinuko_logs.prepare(
    `SELECT * FROM diagnosis_logs WHERE is_test=0 ORDER BY created_at DESC`
  ).all();

  const header = 'ID,日時,判定,スコア,素材,正絹生地,生地,仕立て,装飾,水処理,過去変化,地色,所要秒,テスト\n';
  const csv = rows.results.map(r =>
    [r.id, r.created_at, r.grade, r.score,
     r.ans_material, r.ans_silk_fabric, r.ans_fabric,
     r.ans_tailoring, r.ans_decoration, r.ans_water_history,
     r.ans_past_result, r.ans_color, r.duration_sec, r.is_test
    ].map(v => v ?? '').join(',')
  ).join('\n');

  return new Response(header + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="kinuko-logs.csv"'
    }
  });
}

/* ============================================================
   管理画面: ログインページHTML
   ============================================================ */
function renderAdminLogin(error = '') {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>管理画面 | 長襦袢セルフ判定</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Noto Sans JP', sans-serif; background: #f5f0eb; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { background: #fff; border-radius: 16px; padding: 40px 32px; width: 340px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  h1 { font-size: 1.1rem; color: #4a3728; margin-bottom: 6px; }
  p.sub { font-size: 0.75rem; color: #999; margin-bottom: 28px; }
  label { font-size: 0.8rem; color: #666; display: block; margin-bottom: 6px; }
  input[type=password] { width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem; margin-bottom: 18px; }
  button { width: 100%; padding: 12px; background: #4a7c6f; color: #fff; border: none; border-radius: 8px; font-size: 0.95rem; cursor: pointer; }
  .error { color: #c0392b; font-size: 0.8rem; margin-bottom: 14px; }
</style>
</head>
<body>
<div class="card">
  <h1>🌿 管理画面ログイン</h1>
  <p class="sub">長襦袢セルフ判定 ログ管理</p>
  ${error ? `<p class="error">⚠ ${error}</p>` : ''}
  <form method="POST" action="/hibikinu/login">
    <label>パスワード</label>
    <input type="password" name="password" autofocus placeholder="パスワードを入力">
    <button type="submit">ログイン</button>
  </form>
</div>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/* ============================================================
   管理画面: ダッシュボードHTML（SPA）
   ============================================================ */
function renderAdminApp(request, env, url) {
  if (!checkAuth(request)) {
    return new Response('', { status: 302, headers: { 'Location': '/hibikinu' } });
  }

  const LABEL = {
    material:     { silk: '正絹', mix: '混紡・綿・麻', other: '化繊', unknown: 'わからない' },
    silkFabric:   { chirimen: '縮緬', rinzu: '綸子', ro: '絽紗', seika: '精華', habutae: '羽二重', shioze: '塩瀬', unknown: 'わからない' },
    fabric:       { smooth: '標準', crepe: 'ちりめん凹凸', ro: '絽', unknown: 'わからない' },
    tailoring:    { hitoe: 'ひとえ', awase: '袷', muso: '袖無双', hanmuso: '半無双', shikiate: '居敷当付き', unknown: 'わからない' },
    decoration:   { yes: 'あり', no: 'なし', unknown: 'わからない' },
    waterHistory: { yes: '歴あり', no: 'なし', unknown: 'わからない' },
    pastResult:   { ok: '変化なし', smallshrink: '微縮み', shrink: '大縮み', torn: '裂け', color: '色にじみ', unknown: 'わからない' },
    color:        { white: '白・淡', light: '淡色', mid: '中間色', dark: '濃色', multi: '多色ぼかし', unknown: 'わからない' }
  };

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>管理画面 | 長襦袢セルフ判定</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Noto Sans JP', sans-serif; background: #f5f0eb; color: #3a2e28; font-size: 14px; }
header { background: #4a7c6f; color: #fff; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }
header h1 { font-size: 1rem; font-weight: 600; }
header span { font-size: 0.75rem; opacity: 0.8; }
.tabs { display: flex; gap: 4px; padding: 16px 20px 0; }
.tab { padding: 8px 20px; border-radius: 8px 8px 0 0; background: #e8e0d8; cursor: pointer; font-size: 0.85rem; border: none; color: #666; }
.tab.active { background: #fff; color: #4a7c6f; font-weight: 600; }
.panel { display: none; background: #fff; border-radius: 0 12px 12px 12px; margin: 0 20px 20px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.panel.active { display: block; }

/* 統計 */
.stat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
.stat-card { background: #f9f5f1; border-radius: 10px; padding: 16px; text-align: center; }
.stat-card .num { font-size: 2rem; font-weight: 700; }
.stat-card .num.A { color: #4a7c6f; }
.stat-card .num.B { color: #a0764b; }
.stat-card .num.C { color: #8b3a3a; }
.stat-card .lbl { font-size: 0.72rem; color: #999; margin-top: 4px; }
.charts { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.chart-box { background: #f9f5f1; border-radius: 10px; padding: 12px; min-width: 0; }
.chart-box h3 { font-size: 0.75rem; color: #666; margin-bottom: 10px; text-align: center; }
.chart-box canvas { max-height: 180px; }
/* タブレット：3列 */
@media(max-width:1100px){ .charts { grid-template-columns: repeat(3, 1fr); } }
/* スマホ：2列 */
@media(max-width:600px){ .charts { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
@media(max-width:600px){ .chart-box { padding: 10px; } }
@media(max-width:600px){ .chart-box h3 { font-size: 0.7rem; } }
@media(max-width:600px){ .chart-box canvas { max-height: 150px; } }

/* ログ一覧 */
.toolbar { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
.toolbar select, .toolbar input { padding: 7px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.82rem; }
.btn { padding: 7px 14px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.82rem; }
.btn-green  { background: #4a7c6f; color: #fff; }
.btn-red    { background: #c0392b; color: #fff; }
.btn-orange { background: #e67e22; color: #fff; }
.btn-gray   { background: #aaa; color: #fff; }
.btn-sm     { padding: 4px 10px; font-size: 0.75rem; border-radius: 4px; border: none; cursor: pointer; }
table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
th { background: #f0ebe4; padding: 8px 6px; text-align: left; font-weight: 600; color: #666; position: sticky; top: 0; }
td { padding: 7px 6px; border-bottom: 1px solid #f0ebe4; vertical-align: middle; }
tr:hover td { background: #fdf9f5; }
tr.test-row td { background: #fff8f0; color: #aaa; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 700; }
.badge-A { background: #e8f4f0; color: #4a7c6f; }
.badge-B { background: #fdf3e3; color: #a0764b; }
.badge-C { background: #fdecea; color: #8b3a3a; }
.badge-test { background: #fff0e0; color: #e67e22; }
.badge-dup  { background: #fdecea; color: #c0392b; font-weight: 700; }
.pagination { display: flex; gap: 6px; justify-content: center; margin-top: 16px; }
.pagination button { padding: 5px 12px; border: 1px solid #ddd; border-radius: 5px; background: #fff; cursor: pointer; font-size: 0.8rem; }
.pagination button.active { background: #4a7c6f; color: #fff; border-color: #4a7c6f; }
.confirm-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:1000; align-items:center; justify-content:center; }
.confirm-overlay.show { display:flex; }
.confirm-box { background:#fff; border-radius:14px; padding:28px 28px 20px; width:320px; text-align:center; }
.confirm-box h3 { font-size:1rem; margin-bottom:10px; }
.confirm-box p { font-size:0.82rem; color:#666; margin-bottom:20px; }
.confirm-box .btns { display:flex; gap:10px; justify-content:center; }
</style>
</head>
<body>

<header>
  <h1>🌿 長襦袢セルフ判定 管理画面</h1>
  <span>Ver 1.50</span>
</header>

<div class="tabs">
  <button class="tab active" onclick="showTab('stats')">📊 統計レポート</button>
  <button class="tab" onclick="showTab('logs')">📋 ログ一覧</button>
  <button class="tab" onclick="showTab('fabric-logs')">🧵 生地ログ</button>
  <button class="tab" onclick="showTab('fabric-stats')">📈 生地統計</button>
</div>

<!-- 統計パネル -->
<div class="panel active" id="panel-stats">
  <div class="stat-cards" id="stat-cards">読み込み中...</div>
  <div class="charts">
    <div class="chart-box"><h3>判定結果の割合</h3><canvas id="chart-grade"></canvas></div>
    <div class="chart-box"><h3>日別診断数（直近30日）</h3><canvas id="chart-daily"></canvas></div>
    <div class="chart-box"><h3>素材の分布</h3><canvas id="chart-material"></canvas></div>
    <div class="chart-box"><h3>生地の種類の割合</h3><canvas id="chart-fabric"></canvas></div>
    <div class="chart-box"><h3>仕立ての割合</h3><canvas id="chart-tailoring"></canvas></div>
    <div class="chart-box"><h3>水処理の割合</h3><canvas id="chart-water"></canvas></div>
    <div class="chart-box"><h3>地色の割合</h3><canvas id="chart-color"></canvas></div>
  </div>
</div>

<!-- ログ一覧パネル -->
<div class="panel" id="panel-logs">
  <div class="toolbar">
    <select id="filter-grade" onchange="loadLogs(1)">
      <option value="">全判定</option>
      <option value="A">A判定</option>
      <option value="B">B判定</option>
      <option value="C">C判定</option>
    </select>
    <select id="filter-test" onchange="loadLogs(1)">
      <option value="">全て</option>
      <option value="0">本番のみ</option>
      <option value="1">テストのみ</option>
    </select>
    <button class="btn btn-red" onclick="confirmDeleteTest()">🗑 テストデータを全削除</button>
    <button class="btn btn-red" onclick="confirmDeleteSelected()">🗑 選択削除</button>
    <button class="btn btn-green" onclick="exportCSV()">⬇ CSV出力</button>
  </div>
  <div style="overflow-x:auto;">
    <table>
      <thead>
        <tr>
          <th><input type="checkbox" id="check-all" onchange="toggleAll(this)"></th>
          <th>ID</th><th>日時</th><th>判定</th><th>スコア</th>
          <th>素材</th><th>生地</th><th>仕立て</th><th>装飾</th>
          <th>水処理</th><th>地色</th><th>🛡️</th><th>🏺</th><th>端末</th><th>重複</th><th>秒</th><th>操作</th>
        </tr>
      </thead>
      <tbody id="log-tbody">
        <tr><td colspan="13" style="text-align:center;padding:20px;color:#aaa;">読み込み中...</td></tr>
      </tbody>
    </table>
  </div>
  <div class="pagination" id="pagination"></div>
</div>

<!-- 確認ダイアログ -->
<div class="confirm-overlay" id="confirm-overlay">
  <div class="confirm-box">
    <h3 id="confirm-title">確認</h3>
    <p id="confirm-msg"></p>
    <div class="btns">
      <button class="btn btn-gray" onclick="closeConfirm()">キャンセル</button>
      <button class="btn btn-red" id="confirm-ok">削除する</button>
    </div>
  </div>
</div>

<!-- 生地ログ一覧パネル -->
<div class="panel" id="panel-fabric-logs">
  <div class="toolbar">
    <button class="btn" id="fabric-btn-real" onclick="setFabricTestFilter(0)" style="background:#4a7c6f;color:#fff;">本番のみ</button>
    <button class="btn" id="fabric-btn-test" onclick="setFabricTestFilter(1)">テストのみ</button>
  </div>
  <div style="overflow-x:auto;">
    <table>
      <thead>
        <tr>
          <th>ID</th><th>日時</th><th>ニックネーム</th>
          <th>素材</th><th>生地</th><th>候補</th>
          <th>確信度</th><th>画像1</th><th>画像2</th><th>画像3</th>
          <th>テスト</th><th>操作</th>
        </tr>
      </thead>
      <tbody id="fabric-log-tbody">
        <tr><td colspan="12" style="text-align:center;padding:20px;">読み込み中...</td></tr>
      </tbody>
    </table>
  </div>
  <div id="fabric-log-pager" style="display:flex;gap:8px;padding:12px 20px;align-items:center;"></div>
</div>

<!-- 生地統計パネル -->
<div class="panel" id="panel-fabric-stats">
  <div class="stat-cards" id="fabric-stat-cards">読み込み中...</div>
  <div class="charts">
    <div class="chart-box"><h3>生地種類の分布</h3><canvas id="chart-fabric-dist"></canvas></div>
    <div class="chart-box"><h3>素材カテゴリの分布</h3><canvas id="chart-material-dist"></canvas></div>
    <div class="chart-box"><h3>確信度の分布</h3><canvas id="chart-conf-dist"></canvas></div>
    <div class="chart-box"><h3>日別判定数（直近30日）</h3><canvas id="chart-fabric-daily"></canvas></div>
  </div>
</div>

<script>
const LABEL = ${JSON.stringify(LABEL)};

function lbl(type, val) {
  return (LABEL[type] && LABEL[type][val]) || val || '-';
}

// ── タブ切り替え ──────────────────────────────────
function showTab(name) {
  const TABS = ['stats','logs','fabric-logs','fabric-stats'];
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', TABS[i] === name);
  });
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  if (name === 'stats')         loadStats();
  if (name === 'logs')          loadLogs(1);
  if (name === 'fabric-logs')   loadFabricLogs(1);
  if (name === 'fabric-stats')  loadFabricStats();
}

// ── 統計読み込み ──────────────────────────────────
async function loadStats() {
  const res = await fetch('/hibikinu/stats');
  if (!res.ok) { location.href = '/hibikinu'; return; }
  const d = await res.json();

  const gc = { A: 0, B: 0, C: 0 };
  d.gradeCount.forEach(r => gc[r.grade] = r.cnt);
  const total = d.total || 1;
  const guardPct   = d.total > 0 ? Math.round((d.guardCnt   || 0) / d.total * 100) : 0;
  const vintagePct = d.total > 0 ? Math.round((d.vintageCnt || 0) / d.total * 100) : 0;

  document.getElementById('stat-cards').innerHTML = \`
    <div class="stat-card"><div class="num">\${d.total}</div><div class="lbl">総診断数</div></div>
    <div class="stat-card"><div class="num A">\${gc.A}</div><div class="lbl">A判定（洗える候補）</div></div>
    <div class="stat-card"><div class="num B">\${gc.B}</div><div class="lbl">B判定（慎重検討）</div></div>
    <div class="stat-card"><div class="num C">\${gc.C}</div><div class="lbl">C判定（非推奨）</div></div>
    <div class="stat-card"><div class="num">\${d.avgScore}</div><div class="lbl">平均スコア</div></div>
    <div class="stat-card"><div class="num">\${guardPct}%</div><div class="lbl">🛡️ ガード加工あり<br><span style="font-size:0.75rem;color:#888;">\${d.guardCnt || 0}件</span></div></div>
    <div class="stat-card"><div class="num">\${vintagePct}%</div><div class="lbl">🏺 ビンテージあり<br><span style="font-size:0.75rem;color:#888;">\${d.vintageCnt || 0}件</span></div></div>
  \`;

  // 判定割合
  makeChart('chart-grade', 'doughnut',
    ['A判定', 'B判定', 'C判定'],
    [gc.A, gc.B, gc.C],
    ['#4a7c6f','#a0764b','#8b3a3a']
  );

  // 日別診断数
  const days = d.daily.slice().reverse();
  if (chartInstances['chart-daily']) { chartInstances['chart-daily'].destroy(); }
  chartInstances['chart-daily'] = new Chart(document.getElementById('chart-daily'), {
    type: 'bar',
    data: {
      labels: days.map(r => r.day.slice(5)),
      datasets: [{ label: '診断数', data: days.map(r => r.cnt), backgroundColor: '#4a7c6f88', borderWidth: 1 }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  // 素材分布
  const matLabels = { silk: '正絹', mix: '混紡', other: '化繊', unknown: 'わからない' };
  makeChart('chart-material', 'doughnut',
    d.materialDist.map(r => matLabels[r.ans_material] || r.ans_material || 'なし'),
    d.materialDist.map(r => r.cnt),
    ['#4a7c6f','#a0764b','#8b3a3a','#7b9e9a','#aaa']
  );

  // 生地の種類の割合
  const fabricLabels = {
    chirimen: '縮緬', rinzu: '綸子', ro: '絽・紗', seika: '精華',
    habutae: '羽二重', shioze: '塩瀬', unknown: 'その他・わからない',
    smooth: '標準的', crepe: 'ちりめん凹凸', null: 'なし'
  };
  makeChart('chart-fabric', 'doughnut',
    d.fabricDist.map(r => fabricLabels[r.fabric_key] || r.fabric_key || 'なし'),
    d.fabricDist.map(r => r.cnt),
    ['#7b9e9a','#4a7c6f','#a0764b','#8b3a3a','#c9a96e','#e0c4a8','#aaa','#6b8f8a']
  );

  // 仕立ての割合
  const tailoringLabels = {
    hitoe: 'ひとえ', awase: '袷', muso: '袖無双胴抜き',
    hanmuso: '半無双', shikiate: '居敷当付き', unknown: 'わからない'
  };
  makeChart('chart-tailoring', 'doughnut',
    d.tailoringDist.map(r => tailoringLabels[r.ans_tailoring] || r.ans_tailoring || 'なし'),
    d.tailoringDist.map(r => r.cnt),
    ['#4a7c6f','#7b9e9a','#a0764b','#c9a96e','#8b3a3a','#aaa']
  );

  // 水処理の割合
  const waterLabels = { yes: '歴あり', no: 'したことがない', unknown: 'わからない' };
  makeChart('chart-water', 'doughnut',
    d.waterHistoryDist.map(r => waterLabels[r.ans_water_history] || r.ans_water_history || 'なし'),
    d.waterHistoryDist.map(r => r.cnt),
    ['#4a7c6f','#a0764b','#aaa']
  );

  // 地色の割合
  const colorLabels = { white: '白・淡色', light: '淡色', mid: '中間色', dark: '濃色', multi: '多色・ぼかし' };
  makeChart('chart-color', 'doughnut',
    d.colorDist.map(r => colorLabels[r.ans_color] || r.ans_color || 'なし'),
    d.colorDist.map(r => r.cnt),
    ['#f0e8d8','#e8c4a0','#c9a96e','#4a3728','#8b3a3a','#aaa']
  );
}

// グラフ生成ヘルパー（再描画時に既存グラフを破棄）
const chartInstances = {};
function makeChart(id, type, labels, data, colors) {
  if (chartInstances[id]) { chartInstances[id].destroy(); }
  const opts = type === 'bar'
    ? { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    : { plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 6, boxWidth: 10 } } } };
  chartInstances[id] = new Chart(document.getElementById(id), {
    type,
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 1 }] },
    options: opts
  });
}

// ── ログ一覧読み込み ──────────────────────────────
let currentPage = 1;
async function loadLogs(page) {
  currentPage = page;
  const grade = document.getElementById('filter-grade').value;
  const test  = document.getElementById('filter-test').value;
  const params = new URLSearchParams({ page, ...(grade && { grade }), ...(test !== '' && { test }) });
  const res = await fetch('/hibikinu/data?' + params);
  if (!res.ok) { location.href = '/hibikinu'; return; }
  const d = await res.json();

  const tbody = document.getElementById('log-tbody');
  if (!d.rows.length) {
    tbody.innerHTML = '<tr><td colspan="15" style="text-align:center;padding:20px;color:#aaa;">データがありません</td></tr>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = d.rows.map(r => {
    const ipCnt = r.ip_hash ? (d.ipCounts[r.ip_hash] || 1) : null;
    const dupBadge = ipCnt && ipCnt > 1
      ? \`<span class="badge badge-dup" title="同一端末から\${ipCnt}回">\${ipCnt}回</span>\`
      : '<span style="color:#ccc;font-size:0.7rem">-</span>';
    const devIcon = !r.device ? '' :
      r.device.startsWith('iPhone') ? '📱' :
      r.device.startsWith('Android') ? '🤖' :
      r.device.startsWith('iPad') ? '📋' : '💻';
    return \`
    <tr class="\${r.is_test ? 'test-row' : ''}">
      <td><input type="checkbox" class="row-check" value="\${r.id}"></td>
      <td>\${r.id}</td>
      <td>\${new Date(\`\${r.created_at.endsWith('Z') ? r.created_at : r.created_at + 'Z'}\`).toLocaleString('ja-JP', {timeZone:'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'})}</td>
      <td><span class="badge badge-\${r.grade}">\${r.grade}</span>\${r.is_test ? ' <span class="badge badge-test">TEST</span>' : ''}</td>
      <td>\${r.score}</td>
      <td>\${lbl('material', r.ans_material)}</td>
      <td>\${r.ans_silk_fabric ? lbl('silkFabric', r.ans_silk_fabric) : lbl('fabric', r.ans_fabric)}</td>
      <td>\${lbl('tailoring', r.ans_tailoring)}</td>
      <td>\${lbl('decoration', r.ans_decoration)}</td>
      <td>\${lbl('waterHistory', r.ans_water_history)}</td>
      <td>\${lbl('color', r.ans_color)}</td>
      <td style="text-align:center">\${r.ans_option_guard   ? '🛡️' : '-'}</td>
      <td style="text-align:center">\${r.ans_option_vintage ? '🏺' : '-'}</td>
      <td style="font-size:0.75rem">\${devIcon} \${r.device || '-'}</td>
      <td style="text-align:center">\${dupBadge}</td>
      <td>\${r.duration_sec || '-'}</td>
      <td>
        <button class="btn-sm \${r.is_test ? 'btn-green' : 'btn-orange'}" onclick="toggleFlag(\${r.id}, \${r.is_test ? 0 : 1})">
          \${r.is_test ? '本番に戻す' : 'TESTにする'}
        </button>
        <button class="btn-sm btn-red" onclick="deleteOne(\${r.id})">削除</button>
      </td>
    </tr>\`;
  }).join('');

  // ページネーション
  const totalPages = Math.ceil(d.total / d.perPage);
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === page) btn.classList.add('active');
    btn.onclick = () => loadLogs(i);
    pagination.appendChild(btn);
  }
}

function toggleAll(cb) {
  document.querySelectorAll('.row-check').forEach(c => c.checked = cb.checked);
}

// ── 削除処理 ─────────────────────────────────────
async function doDelete(payload) {
  await fetch('/hibikinu/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  closeConfirm();
  loadLogs(currentPage);
  if (document.getElementById('panel-stats').classList.contains('active')) loadStats();
}

function confirmDeleteTest() {
  showConfirm('テストデータを全削除', 'TESTフラグのついたデータをすべて削除します。', () => doDelete({ deleteTestAll: true }));
}

function confirmDeleteSelected() {
  const ids = [...document.querySelectorAll('.row-check:checked')].map(c => parseInt(c.value));
  if (!ids.length) return alert('削除するログを選択してください');
  showConfirm('選択したログを削除', \`選択した\${ids.length}件を削除します。\`, () => doDelete({ ids }));
}

function deleteOne(id) {
  showConfirm('ログを削除', \`ID:\${id} を削除します。\`, () => doDelete({ ids: [id] }));
}

// ── テストフラグ切り替え ──────────────────────────
async function toggleFlag(id, is_test) {
  await fetch('/hibikinu/flag', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_test }) });
  loadLogs(currentPage);
}

// ── CSV出力 ──────────────────────────────────────
function exportCSV() { window.location.href = '/hibikinu/export'; }

// ── 確認ダイアログ ───────────────────────────────
let confirmCallback = null;
function showConfirm(title, msg, cb) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  confirmCallback = cb;
  document.getElementById('confirm-ok').onclick = () => confirmCallback && confirmCallback();
  document.getElementById('confirm-overlay').classList.add('show');
}
function closeConfirm() { document.getElementById('confirm-overlay').classList.remove('show'); }

// ── 生地ログ ─────────────────────────────────────
const FABRIC_NAME = {
  chirimen:'ちりめん', rinzu:'綸子', habutae:'羽二重',
  ro:'絽・紗', seika:'精華パレス', shioze:'塩瀬',
  smooth:'平織り', unknown:'わからない', closest_match:'候補なし'
};
const MATERIAL_NAME = {
  silk:'絹', cotton:'綿', linen:'麻', poly:'ポリ', other:'その他'
};
const CONF_NAME = { high:'高', mid:'中', low:'低' };

let fabricTestFilter = 0;
let fabricCurrentPage = 1;
const FABRIC_PER_PAGE = 50;

function setFabricTestFilter(v) {
  fabricTestFilter = v;
  document.getElementById('fabric-btn-real').style.background = v === 0 ? '#4a7c6f' : '';
  document.getElementById('fabric-btn-real').style.color      = v === 0 ? '#fff'    : '';
  document.getElementById('fabric-btn-test').style.background = v === 1 ? '#c0392b' : '';
  document.getElementById('fabric-btn-test').style.color      = v === 1 ? '#fff'    : '';
  loadFabricLogs(1);
}

async function loadFabricLogs(page) {
  fabricCurrentPage = page;
  const offset = (page - 1) * FABRIC_PER_PAGE;
  const res = await fetch(\`/hibikinu/fabric-data?test=\${fabricTestFilter}&limit=\${FABRIC_PER_PAGE}&offset=\${offset}\`, { credentials: 'same-origin' });
  if (!res.ok) {
    console.error('fabric-data error:', res.status, await res.text().catch(()=>''));
    if (res.status === 401) location.href = '/hibikinu';
    return;
  }
  const d = await res.json();
  const tbody = document.getElementById('fabric-log-tbody');
  if (!d.rows.length) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:20px;">データなし</td></tr>';
  } else {
    tbody.innerHTML = d.rows.map(r => {
      const thumb = (url) => url
        ? \`<a href="/api/fabric-image/\${encodeURIComponent(url)}" target="_blank">
            <img src="/api/fabric-image/\${encodeURIComponent(url)}"
              style="width:48px;height:48px;object-fit:cover;border-radius:4px;"></a>\`
        : '-';
      return \`<tr>
        <td>\${r.id}</td>
        <td style="white-space:nowrap">\${r.created_at?.slice(0,16) || '-'}</td>
        <td>\${r.nickname || '-'}</td>
        <td>\${MATERIAL_NAME[r.material_key] || r.material_key || '-'}</td>
        <td>\${FABRIC_NAME[r.fabric_key] || r.fabric_key || '-'}</td>
        <td>\${r.closest_fabric_key ? (FABRIC_NAME[r.closest_fabric_key] || r.closest_fabric_key) : '-'}</td>
        <td>\${CONF_NAME[r.confidence] || r.confidence || '-'}</td>
        <td>\${thumb(r.image_url_1)}</td>
        <td>\${thumb(r.image_url_2)}</td>
        <td>\${thumb(r.image_url_3)}</td>
        <td>\${r.is_test ? '🧪' : '✅'}</td>
        <td>
          <button class="btn btn-sm" onclick="toggleFabricTest(\${r.id}, \${r.is_test})">\${r.is_test ? '本番へ' : 'テストへ'}</button>
          <button class="btn btn-red btn-sm" onclick="deleteFabricLog(\${r.id})">削除</button>
        </td>
      </tr>\`;
    }).join('');
  }
  // ページャー
  const totalPages = Math.ceil(d.total / FABRIC_PER_PAGE);
  const pager = document.getElementById('fabric-log-pager');
  pager.innerHTML = \`
    <span style="font-size:0.85rem;color:#666;">計 \${d.total} 件 / \${page}/\${totalPages} ページ</span>
    \${page > 1 ? \`<button class="btn" onclick="loadFabricLogs(\${page-1})">← 前</button>\` : ''}
    \${page < totalPages ? \`<button class="btn" onclick="loadFabricLogs(\${page+1})">次 →</button>\` : ''}
  \`;
}

async function toggleFabricTest(id, current) {
  await fetch('/hibikinu/fabric-flag', {
    method:'POST', headers:{'Content-Type':'application/json'},
    credentials: 'same-origin',
    body: JSON.stringify({ id, is_test: current ? 0 : 1 })
  });
  loadFabricLogs(fabricCurrentPage);
}

async function deleteFabricLog(id) {
  if (!confirm('このログを削除しますか？')) return;
  await fetch('/hibikinu/fabric-delete', {
    method:'POST', headers:{'Content-Type':'application/json'},
    credentials: 'same-origin',
    body: JSON.stringify({ id })
  });
  loadFabricLogs(fabricCurrentPage);
}

// ── 生地統計 ─────────────────────────────────────
let fabricCharts = {};
async function loadFabricStats() {
  const res = await fetch('/hibikinu/fabric-stats', { credentials: 'same-origin' });
  if (!res.ok) {
    console.error('fabric-stats error:', res.status, await res.text().catch(()=>''));
    if (res.status === 401) location.href = '/hibikinu';
    return;
  }
  const d = await res.json();

  document.getElementById('fabric-stat-cards').innerHTML = \`
    <div class="stat-card"><div class="stat-num">\${d.total}</div><div class="stat-label">総判定数</div></div>
  \`;

  const drawPie = (id, labels, data, colors) => {
    if (fabricCharts[id]) fabricCharts[id].destroy();
    const ctx = document.getElementById(id)?.getContext('2d');
    if (!ctx) return;
    fabricCharts[id] = new Chart(ctx, {
      type: 'pie',
      data: { labels, datasets: [{ data, backgroundColor: colors }] },
      options: { plugins: { legend: { position: 'right' } } }
    });
  };

  const drawBar = (id, labels, data) => {
    if (fabricCharts[id]) fabricCharts[id].destroy();
    const ctx = document.getElementById(id)?.getContext('2d');
    if (!ctx) return;
    fabricCharts[id] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: '#4a7c6f88' }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  };

  // 生地種類分布
  const fabricColors = ['#e8a87c','#7cb9e8','#a8e87c','#e87c9a','#b87ce8','#e8d87c','#7ce8d8','#aaa'];
  drawPie('chart-fabric-dist',
    d.fabricDist.map(r => FABRIC_NAME[r.fabric_key] || r.fabric_key),
    d.fabricDist.map(r => r.cnt), fabricColors);

  // 素材分布
  const matColors = ['#c9a96e','#6eb5c9','#6ec98a','#c96e6e','#999'];
  drawPie('chart-material-dist',
    d.materialDist.map(r => MATERIAL_NAME[r.material_key] || r.material_key),
    d.materialDist.map(r => r.cnt), matColors);

  // 確信度分布
  drawPie('chart-conf-dist',
    d.confDist.map(r => CONF_NAME[r.confidence] || r.confidence),
    d.confDist.map(r => r.cnt), ['#4a7c6f','#a0764b','#c0392b']);

  // 日別
  const dailyRev = [...d.daily].reverse();
  drawBar('chart-fabric-daily', dailyRev.map(r => r.day), dailyRev.map(r => r.cnt));
}

// ── 初期表示 ─────────────────────────────────────
loadStats();
</script>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
