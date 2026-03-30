/* ===========================
   長襦袢セルフ判定 - UI描画
   =========================== */

/* ── ロゴ画像パス ── */
const LOGO_IMG = 'images/logo.png';


/* =============================
   ① トップ画面
   ============================= */
function renderTop() {
  return `
<div class="screen">
  <div class="top-hero">
    <img src="${LOGO_IMG}" alt="日々、絹子さん。" class="top-logo-img" />
    <h1 class="top-title">その長襦袢、<br>お家で洗えそうかな？</h1>
    <p class="top-subtitle">目安のセルフ判定</p>
    <p class="top-version">Ver 1.21</p>

    <div class="top-cards">
      <div class="top-card">
        <span class="top-card-icon">🌿</span>
        <div class="top-card-text">
          <strong>生地・仕立て・色を確認</strong>
          素材の特徴や染め方から洗いやすさを確認します
        </div>
      </div>
      <div class="top-card">
        <span class="top-card-icon">📋</span>
        <div class="top-card-text">
          <strong>過去の洗い履歴を参考に</strong>
          水通しや丸洗い歴は大切な判断材料です
        </div>
      </div>
      <div class="top-card">
        <span class="top-card-icon">🎯</span>
        <div class="top-card-text">
          <strong>3段階で目安をお知らせ</strong>
          洗える候補 ／ 慎重検討 ／ 自宅洗い非推奨
        </div>
      </div>
    </div>

    <button class="btn-primary" onclick="App.goGuide()">診断をはじめる</button>
    <p class="top-notice">
      ※この判定は目安です。大切なお品や不安のあるお品は、<br>専門店へのご相談をおすすめします。
    </p>
  </div>
</div>`;
}


/* =============================
   ② 案内画面
   ============================= */
function renderGuide() {
  return `
<div class="screen">
  <div class="nav-bar">
    <button class="nav-back" onclick="App.goTop()">←</button>
    <span class="nav-title">長襦袢セルフ判定</span>
    <div class="nav-right"></div>
  </div>

  <div class="content guide-screen">
    <h2 class="guide-title">診断の前に</h2>

    <div class="guide-items">
      <div class="guide-item">
        <span class="guide-item-icon">💡</span>
        <p class="guide-item-text">わからない項目は、無理に判断しなくて大丈夫です。</p>
      </div>
      <div class="guide-item">
        <span class="guide-item-icon">✋</span>
        <p class="guide-item-text">迷ったら「わからない」で進めます。安全のため、不明点が多い場合は慎重な判定になります。</p>
      </div>
      <div class="guide-item">
        <span class="guide-item-icon">🌸</span>
        <p class="guide-item-text">この判定は「断定診断」ではなく、目安をお知らせする支援ツールです。大切なお品は専門店へご相談ください。</p>
      </div>
    </div>

    <button class="btn-primary" onclick="App.startQuiz()">7問の診断をはじめる</button>
  </div>
</div>`;
}


/* =============================
   ③ 質問画面
   ============================= */
function renderQuestion(q, qIndex, answers, totalQ) {
  const progress = Math.round(((qIndex) / totalQ) * 100);
  const selected = answers[q.key] || null;

  const choicesHTML = q.choices.map(c => `
    <li>
      <button
        class="choice-btn ${selected === c.id ? 'selected' : ''}"
        data-key="${q.key}"
        data-id="${c.id}"
        onclick="App.selectChoice('${q.key}', '${c.id}')"
      >
        <span class="choice-icon">${c.icon}</span>
        <span>${c.label}</span>
      </button>
    </li>
  `).join('');

  return `
<div class="screen">
  <div class="nav-bar">
    <button class="nav-back" onclick="App.prevQuestion()">←</button>
    <span class="nav-title">${q.label}</span>
    <div class="nav-right"></div>
  </div>

  <div class="progress-wrap">
    <p class="progress-label">質問 ${qIndex + 1} / ${totalQ}</p>
    <div class="progress-bar-track">
      <div class="progress-bar-fill" style="width:${progress}%"></div>
    </div>
  </div>

  <div class="content">
    <p class="question-no">QUESTION ${qIndex + 1}</p>
    <h2 class="question-text">${q.text.replace(/\n/g, '<br>')}</h2>
    <div class="question-hint">${q.hint.replace(/\n/g, '<br>')}</div>
    <ul class="choice-list">
      ${choicesHTML}
    </ul>
  </div>

  <div class="btn-footer">
    <button
      class="btn-primary"
      id="next-btn"
      onclick="App.nextQuestion()"
      ${selected ? '' : 'disabled'}
    >
      ${q.key === 'material' ? '次へ' : (qIndex + 1 < totalQ ? '次の質問へ' : '結果を見る')}
    </button>
  </div>
</div>`;
}


/* =============================
   ③-b 素材推定 確認画面
   ============================= */
function renderMaterialConfirm(guessedLabel) {
  const iconMap = {
    silk: '🌿',
    poly: '✨',
    mix:  '🧶'
  };
  const icon = iconMap[guessedLabel.key] || '🤔';

  const descMap = {
    silk: '光沢・手触り・シワのつき方・音の特徴から、<strong>正絹（シルク）</strong>に近い生地と推定されました。',
    poly: '光沢・手触り・シワのつき方・音の特徴から、<strong>化繊（ポリエステルなど）</strong>に近い生地と推定されました。',
    mix:  '光沢・手触り・シワのつき方・音の特徴から、<strong>混紡・綿・麻・ウール</strong>に近い生地と推定されました。'
  };
  const desc = descMap[guessedLabel.key] || '生地の特徴から素材を推定しました。';

  return `
<div class="screen">
  <div class="nav-bar">
    <button class="nav-back" onclick="App.confirmMaterial(false)">←</button>
    <span class="nav-title">素材の推定結果</span>
    <div class="nav-right"></div>
  </div>

  <div class="content" style="text-align:center; padding-top: 32px;">
    <div style="font-size: 3rem; margin-bottom: 16px;">${icon}</div>
    <h2 style="font-size: 1.15rem; font-weight: 700; color: var(--col-main); margin-bottom: 12px;">
      この生地は…
    </h2>
    <div style="
      background: rgba(74,124,111,0.07);
      border: 1.5px solid var(--col-moegi);
      border-radius: 14px;
      padding: 18px 20px;
      margin: 0 0 20px;
      font-size: 1rem;
      line-height: 1.8;
      color: var(--col-text);
    ">
      ${desc}
    </div>
    <p style="font-size: 0.82rem; color: var(--col-sub); line-height: 1.7; margin-bottom: 28px;">
      この推定をもとに、続けて診断を進めます。<br>
      推定が合っていない場合は「やり直す」を押してください。
    </p>

    <div class="btn-footer" style="flex-direction: column; gap: 12px; padding: 0;">
      <button class="btn-primary" onclick="App.confirmMaterial(true)">
        <strong>はい、この想定で進める</strong>
      </button>
      <button class="btn-secondary" onclick="App.confirmMaterial(false)">
        いいえ、やり直す（4問を最初から）
      </button>
    </div>
  </div>
</div>`;
}


/* =============================
   ④ ローディング画面
   ============================= */
function renderLoading() {
  return `
<div class="screen">
  <div class="loading-screen">
    <div class="loading-spinner"></div>
    <h2 class="loading-title">判定しています…</h2>
    <p class="loading-text">
      生地・仕立て・色・過去の履歴から、<br>
      自宅洗いの目安を確認しています。
    </p>
  </div>
</div>`;
}


/* =============================
   ⑤ 判定結果画面
   ============================= */
function renderResult(result) {
  const rc = RESULT_CONTENT[result.grade];
  const ans = result.answers || {};

  const colorWarningHTML = (ans.color === 'dark' || ans.color === 'multi') ? `
  <div style="margin: 0 20px 4px; background:#fff0f0; border:1px solid #e8a0a0; border-radius:10px; padding:12px 16px; font-size:0.8rem; color:#c0392b; line-height:1.7;">
    ⚠ <strong>色落ち・色移りの可能性があるためご注意ください。</strong><br>
    洗う前に目立たない箇所で色落ちテストをおすすめします。他の衣類と分けて洗ってください。
  </div>` : '';

  const chipsHTML = result.chips.map(chip => {
    const cls = chip.type === 'danger'  ? 'chip-c'
              : chip.type === 'caution' ? 'chip-b'
              : chip.type === 'safe'    ? 'chip-a'
              : 'chip-neutral';
    const icon = chip.type === 'danger' ? '⚠ ' : chip.type === 'safe' ? '✓ ' : '• ';
    return `<span class="chip ${cls}">${icon}${chip.label}</span>`;
  }).join('');

  const buttonsHTML = rc.buttons.map(btn => {
    let cls = 'btn-secondary';
    if (btn.style === 'primary')   cls = 'btn-primary';
    if (btn.style === 'enji')      cls = 'btn-enji';
    if (btn.style === 'kincha')    cls = 'btn-kincha';
    if (btn.style === 'orange')    cls = 'btn-orange';
    if (btn.style === 'skyblue')   cls = 'btn-skyblue';
    const isBold = (btn.style === 'orange' || btn.style === 'skyblue' || btn.style === 'primary');
    const labelHTML = isBold ? `<strong>${btn.label}</strong>` : btn.label;
    return `<button class="${cls}" onclick="App.resultAction('${btn.action}')">${labelHTML}</button>`;
  }).join('');

  return `
<div class="screen result-screen">
  <div class="result-color-bar ${rc.barClass}"></div>

  <div class="result-hero">
    <span class="result-badge ${rc.badgeClass}">${rc.badge}</span>
    <div class="result-icon">${rc.icon}</div>
    <h2 class="result-title">${rc.title}</h2>
    <p class="result-desc">${rc.desc.replace(/\n/g, '<br><br>')}${(ans.material === 'silk') ? '<br><br>ただし、正絹はとても繊細です。強くこすらない・長く浸けない・やさしく短時間で扱うことが大切です。' : ''}</p>
  </div>

  <div class="reason-section">
    <p class="reason-title">▍ ${rc.reasonTitle}</p>
    <div class="chip-wrap">
      ${chipsHTML || '<span class="chip chip-neutral">・回答が少ないため詳細な理由を表示できません</span>'}
    </div>
  </div>

  <div style="padding: 0 20px;">
    <p style="font-size:0.8rem; color:var(--col-sub); background:rgba(160,118,75,0.06); border-radius:10px; padding:12px 14px; line-height:1.7;">
      💡 ${rc.recommend}
    </p>
  </div>

  ${colorWarningHTML}

  <div class="btn-footer">
    ${buttonsHTML}
  </div>

  <p class="common-notice">
    ※この判定は回答内容に基づく目安です。実際のお品の状態や個体差によって結果は変わることがあります。<br>
    大切なお品は専門店へご相談ください。
  </p>
</div>`;
}


/* =============================
   ⑥ 判定理由の詳細画面
   ============================= */
function renderDetail(result) {
  const rc = RESULT_CONTENT[result.grade];
  const ans = result.answers;

  // 質問ごとの回答サマリーを生成
  const summaryRows = QUESTIONS.map(q => {
    const answerId = ans[q.key];
    const choice = q.choices.find(c => c.id === answerId);
    if (!choice) return null;

    const chipKey = `${q.key}_${answerId}`;
    const chip = REASON_CHIPS[chipKey];
    const note = DETAIL_NOTES[chipKey];

    const riskIcon = chip?.type === 'danger'  ? '🔴'
                   : chip?.type === 'caution' ? '🟡'
                   : chip?.type === 'safe'    ? '🟢'
                   : '⚪';

    return `
      <div class="detail-item">
        <span class="detail-item-icon">${riskIcon}</span>
        <div class="detail-item-body">
          <p class="detail-item-label">${q.label.replace('Q', '').replace('／', '').trim()}</p>
          <p class="detail-item-value">${choice.icon} ${choice.label}</p>
          ${note ? `<p class="detail-item-note">${note}</p>` : ''}
        </div>
      </div>
    `;
  }).filter(Boolean).join('');

  return `
<div class="screen">
  <div class="nav-bar">
    <button class="nav-back" onclick="App.showResult()">←</button>
    <span class="nav-title">判定理由の詳細</span>
    <div class="nav-right"></div>
  </div>

  <div class="content">
    <h2 class="page-heading">回答と判定への影響</h2>
    <p class="page-sub">
      各回答が、どのように判定に影響しているかを確認できます。<br>
      🔴 危険要素 ／ 🟡 慎重要素 ／ 🟢 安心材料 ／ ⚪ 参考情報
    </p>

    <div class="detail-card">
      ${summaryRows}
    </div>
  </div>

  <div class="btn-footer">
    <button class="btn-primary" onclick="App.showResult()">結果画面に戻る</button>
  </div>
</div>`;
}


/* =============================
   ⑦ 洗う場合の注意点画面
   ============================= */
function renderCaution(grade, answers) {
  answers = answers || {};
  const isB = grade === 'B';

  return `
<div class="screen">
  <div class="nav-bar">
    <button class="nav-back" onclick="App.showResult()">←</button>
    <span class="nav-title">洗う前の注意点</span>
    <div class="nav-right"></div>
  </div>

  <div class="content">
    <h2 class="page-heading">洗う前に確認したいこと</h2>
    ${(answers.color === 'dark' || answers.color === 'multi') ? `
    <div style="background:#fff0f0; border:1px solid #e8a0a0; border-radius:10px; padding:12px 16px; margin-bottom:16px; font-size:0.8rem; color:#c0392b; line-height:1.7;">
      ⚠ <strong>色落ち・色移りにご注意ください。</strong><br>
      洗う前に目立たない箇所で色落ちテストをおすすめします。他の衣類と分けて洗い、白いタオル等に触れさせないようにしてください。
    </div>` : ''}

    ${(answers.material === 'silk' || answers.material === 'mix' && answers.silkFabric) ? `
    <p class="page-sub">
      正絹はとても繊細です。<br>
      <strong>やさしく・短時間で・無理をしない</strong>ことが大切です。
    </p>` : ''}

    ${isB ? `
    <div style="background:var(--col-chip-b);border:1px solid rgba(160,118,75,0.2);border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:0.78rem;color:var(--col-kincha);line-height:1.7;">
      ⚠ 慎重判定です。試す場合は、まず目立たない箇所で小さな試験洗いをすることを強くおすすめします。
    </div>` : ''}

    <div class="caution-list">
      <div class="caution-item">
        <span class="caution-icon">💧</span>
        <div class="caution-text">
          <strong>2〜3分程度の手洗い</strong>
          <span>30度以下の水を使い、水4Lに対し洗う絹子さん10mlをいれた「絹子液」をつくります。2〜3分、長くても5分以内で押し洗いしてください。詳しくは公式ホームページの洗い方をご確認ください。</span>
        </div>
      </div>
      <div class="caution-item">
        <span class="caution-icon">🤲</span>
        <div class="caution-text">
          <strong>こすらず、やさしく押し洗い</strong>
          <span>繊維をこすると傷みやすくなります。やさしく押したり、軽く泳がせるようにして洗いましょう。</span>
        </div>
      </div>
      <div class="caution-item">
        <span class="caution-icon">👘</span>
        <div class="caution-text">
          <strong>単品で洗う</strong>
          <span>他のものと一緒に洗わず、必ずこの長襦袢だけで洗ってください。色移りや絡まりを防ぎます。</span>
        </div>
      </div>
      <div class="caution-item">
        <span class="caution-icon">🎨</span>
        <div class="caution-text">
          <strong>色落ちを先に確認する</strong>
          <span>まず目立たない部分を少し濡らして、白い布に押し当てて色が出ないか確認してください。</span>
        </div>
      </div>
      <div class="caution-item">
        <span class="caution-icon">🧴</span>
        <div class="caution-text">
          <strong>タオルドライで脱水する</strong>
          <span>洗い終わったら、絞らずにタオルで挟み、やさしく押さえて水分を吸い取ってください。強く絞ると生地が傷み、型崩れの原因になります。</span>
        </div>
      </div>
      <div class="caution-item">
        <span class="caution-icon">💨</span>
        <div class="caution-text">
          <strong>風通しの良い場所で陰干し</strong>
          <span>直射日光や乾燥機は避け、風通しの良い日陰で形を整えながら干してください。</span>
          <span style="color:#c0392b;font-weight:500;">着物用ハンガーを使って横にひっぱるようにして形を整えて掛けましょう。干し方は縮みの結果に大きく左右しますので面倒くさがらずに丁寧に行いましょう。</span>
        </div>
      </div>
      <div class="caution-item">
        <span class="caution-icon">🛑</span>
        <div class="caution-text">
          <strong>少しでも不安があれば中止する</strong>
          <span>色が出た・生地がよれた・手触りが変わったと感じたら、すぐに水から出して専門店に相談しましょう。</span>
        </div>
      </div>
    </div>
  </div>

  <div class="btn-footer">
    <button class="btn-primary" onclick="App.showResult()">結果画面に戻る</button>
  </div>
</div>`;
}


/* =============================
   ⑧ 相談・次の行動画面
   ============================= */
function renderConsult(grade) {
  const rc = RESULT_CONTENT[grade];

  return `
<div class="screen">
  <div class="nav-bar">
    <button class="nav-back" onclick="App.showResult()">←</button>
    <span class="nav-title">次の一歩</span>
    <div class="nav-right"></div>
  </div>

  <div class="content">
    <h2 class="page-heading">次の一歩を選べます</h2>
    <p class="page-sub">
      判定結果：<strong>${rc.title}</strong><br>
      目的に合った次のアクションをご確認ください。
    </p>

    ${grade !== 'C' ? `
    <div class="action-card">
      <p class="action-card-title">🌿 洗える候補・慎重判定の方へ</p>
      <p class="action-card-desc">
        長襦袢専用の洗剤「洗う絹子さん」を使用することで、
        正絹の風合いを守りながらやさしく洗い上げることができます。
        無香料・無着色・柔軟剤フリー・酵素フリーの処方です。
      </p>
      <button class="btn-primary" onclick="App.showResult()">洗う前の注意点を確認する</button>
    </div>
    ` : ''}

    <div class="action-card">
      <p class="action-card-title">💬 不安がある方・専門的なケアをご希望の方へ</p>
      <p class="action-card-desc">
        大切なお品や、判定が慎重・非推奨だったお品は、
        専門のクリーニング店や呉服店へご相談されることをおすすめします。
        「洗い張り」「丸洗い」など、お品に合ったケア方法をご提案いただけます。
      </p>
      <button class="btn-secondary" onclick="App.showResult()">判定結果に戻る</button>
    </div>

    <div class="action-card">
      <p class="action-card-title">🔄 もう一度診断する</p>
      <p class="action-card-desc">
        別の長襦袢を確認したい場合や、回答を変えて確認したい場合は最初からやり直せます。
      </p>
      <button class="btn-secondary" onclick="App.goTop()">最初からやり直す</button>
    </div>
  </div>

  <p class="common-notice">
    「日々、絹子さん。」は着物を愛する人の日常に寄り添う和装ケアブランドです。
  </p>
</div>`;
}
