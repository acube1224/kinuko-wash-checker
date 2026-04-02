/* ===========================
   絹子さんの生地チェッカー
   fabric.js
   =========================== */

const FabricApp = (() => {

  // 状態
  const state = {
    screen: 'top',   // top | guide | upload | loading | result | error
    images: [null, null, null],  // base64 x3
    result: null,
    loadingTimer: null,
    loadingSeconds: 0,
  };

  // 撮影スロット定義
  const SLOTS = [
    { label: '生地の目・接写',       hint: '生地の織り目がわかるよう、できるだけ寄って撮影' },
    { label: '光沢感・マット感',     hint: '斜めから光を当て、光沢感やマット感がわかるように撮影' },
    { label: '紋様・透け感',         hint: '地紋や透け感がわかる箇所に近寄って撮影（無地の場合は別角度で）' },
  ];

  // 生地名マッピング（キー→表示名）
  const FABRIC_NAMES = {
    chirimen: 'ちりめん',
    rinzu:    '綸子',
    habutae:  '羽二重',
    ro:       '絽・紗',
    seika:    '精華パレス',
    shioze:   '塩瀬',
    smooth:   '平織り・一般的な生地',
    unknown:  'わからない',
  };

  // 素材カテゴリマッピング（キー→表示名・色）
  const MATERIAL_LABELS = {
    silk:    { label: '絹（シルク）',     color: '#7a5530' },
    cotton:  { label: '綿（コットン）',   color: '#4a7c6f' },
    linen:   { label: '麻（リネン）',     color: '#6b8c5a' },
    poly:    { label: 'ポリエステル',     color: '#3d5a6e' },
    other:   { label: 'その他・不明',     color: '#888888' },
  };

  // ── レンダリング ──────────────────────────────

  function render() {
    const el = document.getElementById('fabric-app');
    switch (state.screen) {
      case 'top':     el.innerHTML = renderTop();    break;
      case 'guide':   el.innerHTML = renderGuide();  break;
      case 'upload':  el.innerHTML = renderUpload(); break;
      case 'loading': el.innerHTML = renderLoading(); break;
      case 'result':  el.innerHTML = renderResult(); break;
      case 'error':   el.innerHTML = renderError();  break;
    }
  }

  // トップ画面
  function renderTop() {
    return `
<div class="fabric-screen">
  <div style="padding: 32px 16px 20px; text-align:center;">
    <img src="../images/logo.png" alt="絹子さん" style="width:80px; height:80px; object-fit:contain; margin-bottom:12px;">
    <p class="fabric-top-title">その長襦袢、何の生地かな？<br>絹子さんのAI生地チェッカー</p>
    <p class="fabric-top-sub">Ver 1.50</p>
  </div>

  <p style="font-size:0.9rem; color:#6e6058; text-align:center; padding:0 24px 20px; line-height:1.7;">
    長襦袢の生地の種類がわからなくても大丈夫。<br>
    スマートフォンのカメラで<strong>3枚</strong>写真を撮るだけで、<br>
    AIが生地の種類を判定します。
  </p>

  <div class="fabric-point-cards">
    <div class="fabric-point-card">
      <span class="fabric-point-icon">📸</span>
      <div class="fabric-point-body">
        <strong>3枚撮影するだけ</strong>
        <span>全体・光沢・アップの3枚を順番に撮影します</span>
      </div>
    </div>
    <div class="fabric-point-card">
      <span class="fabric-point-icon">🤖</span>
      <div class="fabric-point-body">
        <strong>AIが瞬時に判定</strong>
        <span>生地の特徴からAIが種類を判定します</span>
      </div>
    </div>
    <div class="fabric-point-card">
      <span class="fabric-point-icon">📋</span>
      <div class="fabric-point-body">
        <strong>素材と生地の種類がわかる</strong>
        <span>絹・綿・麻・ポリなど素材から生地の種類まで判定します</span>
      </div>
    </div>
  </div>

  <div style="padding: 0 16px 20px;">
    <button class="btn-fabric-primary" onclick="FabricApp.goGuide()">撮影をはじめる</button>
  </div>

  <p class="fabric-top-notice">
    ※この判定はAIによる参考判定です。生地の状態・撮影環境により精度が変わる場合があります。判定不明になる場合もあります。あくまでも目安としてご利用ください。
  </p>

  <p style="text-align:center; padding-bottom:20px;">
    <a href="/" style="font-size:0.8rem; color:#aaa; text-decoration:underline;">← 絹子さんチェッカーに戻る</a>
  </p>
</div>`;
  }

  // 撮影ガイド画面
  function renderGuide() {
    return `
<div class="fabric-screen">
  <div class="fabric-nav">
    <button class="fabric-nav-back" onclick="FabricApp.goTop()">←</button>
    <span class="fabric-nav-title">撮影のガイド</span>
    <div style="width:40px;"></div>
  </div>

  <p class="fabric-page-title">3枚の写真を撮影します</p>
  <p class="fabric-page-sub">それぞれのポイントを押さえて撮影すると、より正確に判定できます。</p>

  <div class="guide-cards">
    <div class="guide-card">
      <div class="guide-card-num">1</div>
      <div class="guide-card-body">
        <strong>生地の目・接写</strong>
        <span>生地の織り目・シボがわかるよう、できるだけ寄って撮影してください</span>
      </div>
    </div>
    <div class="guide-card">
      <div class="guide-card-num">2</div>
      <div class="guide-card-body">
        <strong>光沢感・マット感</strong>
        <span>斜めから光を当て、光沢感やマット感がはっきりわかるように撮影してください</span>
      </div>
    </div>
    <div class="guide-card">
      <div class="guide-card-num">3</div>
      <div class="guide-card-body">
        <strong>紋様・透け感</strong>
        <span>地紋や透け感がわかる箇所に近寄って撮影してください（無地の場合は別角度で）</span>
      </div>
    </div>
  </div>

  <div style="padding: 0 16px;">
    <button class="btn-fabric-primary" onclick="FabricApp.goUpload()">写真を選ぶ・撮影する</button>
  </div>
</div>`;
  }

  // アップロード画面
  function renderUpload() {
    const allReady = state.images.every(img => img !== null);
    const slots = SLOTS.map((slot, i) => {
      const hasImg = state.images[i] !== null;
      return `
      <label class="upload-slot ${hasImg ? 'has-image' : ''}">
        <div class="upload-slot-num">${hasImg ? '✓' : i + 1}</div>
        <div class="upload-slot-info">
          <strong>${slot.label}</strong>
          <span>${slot.hint}</span>
        </div>
        ${hasImg
          ? `<img src="${state.images[i]}" class="upload-slot-thumb" alt="撮影画像${i+1}">`
          : `<span class="upload-slot-add">タップして選択</span>`
        }
        <input type="file" accept="image/*" capture="environment"
          onchange="FabricApp.onImageSelect(event, ${i})">
      </label>`;
    }).join('');

    return `
<div class="fabric-screen">
  <div class="fabric-nav">
    <button class="fabric-nav-back" onclick="FabricApp.goGuide()">←</button>
    <span class="fabric-nav-title">写真を選択</span>
    <div style="width:40px;"></div>
  </div>

  <p class="fabric-page-sub" style="padding-top:12px;">
    3枚すべて選択すると判定できます<br>
    <span style="font-size:0.78rem; color:#bbb;">（${state.images.filter(Boolean).length}/3 枚選択済み）</span>
  </p>

  <div class="upload-slots">
    ${slots}
  </div>

  <div style="padding: 0 16px;">
    <button class="btn-fabric-primary"
      onclick="FabricApp.startJudge()"
      ${allReady ? '' : 'disabled style="opacity:0.4; cursor:not-allowed;"'}>
      AIに判定してもらう
    </button>
  </div>
</div>`;
  }

  // ローディング画面
  function renderLoading() {
    return `
<div class="fabric-screen">
  <div class="fabric-loading">
    <div class="fabric-loading-spinner"></div>
    <p class="fabric-loading-text">絹子さんAIが判定中…</p>
    <p id="fabric-loading-timer" style="font-size:1.1rem; font-weight:700; color:#a0764b; margin-top:6px; letter-spacing:0.05em;">${state.loadingSeconds}秒</p>
    <p style="font-size:0.78rem; color:#bbb; margin-top:4px;">しばらくお待ちください</p>
  </div>
</div>`;
  }

  // 結果画面
  function renderResult() {
    const r = state.result;
    const isClosest = r.fabricKey === 'closest_match';
    const isUnknown = r.fabricKey === 'unknown';
    const fabricName = isClosest
      ? 'リストの生地には該当しませんでした'
      : isUnknown
      ? 'わからない'
      : (FABRIC_NAMES[r.fabricKey] || r.fabricKey);

    // unknown時のヒント表示
    const unknownHintHtml = isUnknown && r.unknownHint ? `
      <p style="font-size:0.88rem; color:#888; margin-top:4px;">
        （${r.unknownHint} の可能性）
      </p>` : '';
    const matInfo = MATERIAL_LABELS[r.materialKey] || MATERIAL_LABELS.other;

    // 確信度を0〜95%の5%ステップで表示（100%はあり得ないため上限95%）
    // high: 75〜95%、mid: 45〜70%、low: 15〜40%
    const confRanges = {
      high: [75, 80, 85],
      mid:  [45, 50, 55, 60, 65, 70],
      low:  [15, 20, 25, 30, 35, 40],
    };
    const ranges = confRanges[r.confidence] || confRanges.low;
    // 判定結果のfabricKeyを使ってシード値的に固定（同じ結果なら同じ%）
    const seedIdx = (r.fabricKey || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const confPct = ranges[seedIdx % ranges.length];
    const confColor = r.confidence === 'high' ? '#2a7a4b'
                    : r.confidence === 'mid'  ? '#a0764b'
                    : '#999';
    const confLabel = `確信度 ${confPct}%`;

    // 素材カテゴリバッジ
    const materialBadge = `<span style="
      display:inline-block; padding:4px 14px;
      background:${matInfo.color}20; color:${matInfo.color};
      border:1px solid ${matInfo.color}60;
      border-radius:20px; font-size:0.82rem; font-weight:700;
      margin-bottom:8px;">${matInfo.label}</span>`;

    // closest_match の場合の候補カード
    const closestCard = isClosest && r.closestName ? `
    <div class="fabric-closest-card">
      <p class="fabric-closest-label">🔍 最も近い生地</p>
      <p class="fabric-closest-name">${r.closestName}</p>
      <p class="fabric-closest-desc">リスト外ですが、最もこれに近い生地と判断しました。</p>
      <p class="fabric-closest-reason">💬 ${r.closestReason}</p>
    </div>` : '';

    // 撮影写真サムネイル
    const thumbsHtml = `
    <div class="fabric-result-thumbs">
      <p class="fabric-result-thumbs-label">📷 あなたが撮った写真を元に判定しています</p>
      <div class="fabric-result-thumbs-row">
        ${state.images.map((img, i) => img
          ? `<div class="fabric-result-thumb-wrap"><img class="fabric-result-thumb" src="${img}" alt="撮影${i+1}"><span class="fabric-result-thumb-label">${SLOTS[i].label}</span></div>`
          : '').join('')}
      </div>
    </div>`;

    return `
<div class="fabric-screen">
  <div class="fabric-nav">
    <button class="fabric-nav-back" onclick="FabricApp.goUpload()">←</button>
    <span class="fabric-nav-title">判定結果</span>
    <div style="width:40px;"></div>
  </div>

  <div style="padding: 12px 0 0;">
    ${thumbsHtml}
    <div class="fabric-result-card">
      <p class="fabric-result-label">AI判定結果</p>
      ${materialBadge}
      <p class="fabric-result-name${isClosest ? ' no-match' : ''}">${fabricName}</p>
      ${unknownHintHtml}
      <div class="fabric-confidence">
        <span style="font-size:0.85rem; font-weight:700; color:${confColor};">${confLabel}</span>
        <div style="margin-top:5px; background:#eee; border-radius:6px; height:8px; width:100%; overflow:hidden;">
          <div style="height:100%; width:${confPct}%; background:${confColor}; border-radius:6px; transition:width 0.6s ease;"></div>
        </div>
      </div>
      <div class="fabric-comment">
        💬 ${r.comment}
      </div>
    </div>

    ${closestCard}

    <p class="fabric-result-notice">
      ※AIによる参考判定です。判定を保証するものではありません。
    </p>

    <div class="fabric-btn-area">
      <button class="btn-fabric-secondary"
        onclick="FabricApp.goTop()">
        撮り直す
      </button>
    </div>
  </div>
</div>`;
  }

  // エラー画面
  function renderError() {
    return `
<div class="fabric-screen">
  <div class="fabric-nav">
    <button class="fabric-nav-back" onclick="FabricApp.goUpload()">←</button>
    <span class="fabric-nav-title">判定エラー</span>
    <div style="width:40px;"></div>
  </div>
  <div style="padding: 32px 16px;">
    <div class="fabric-error">
      ${state.errorMsg || '判定中にエラーが発生しました。もう一度お試しください。'}
    </div>
    <button class="btn-fabric-secondary" onclick="FabricApp.goUpload()" style="margin-top:8px;">
      もう一度試す
    </button>
    <button class="btn-fabric-link" onclick="FabricApp.goTop()">
      最初からやり直す
    </button>
  </div>
</div>`;
  }

  // ── アクション ──────────────────────────────

  function goTop() {
    state.screen = 'top';
    state.images = [null, null, null];
    state.result = null;
    render();
  }

  function goGuide() {
    state.screen = 'guide';
    render();
  }

  function goUpload() {
    state.screen = 'upload';
    render();
  }

  function onImageSelect(event, index) {
    const file = event.target.files[0];
    if (!file) return;

    // 画像をリサイズしてbase64化（精度向上のため最大1280px）
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1280;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else       { w = Math.round(w * MAX / h); h = MAX; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        state.images[index] = canvas.toDataURL('image/jpeg', 0.85);
        render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // カウントアップタイマー開始
  function startLoadingTimer() {
    state.loadingSeconds = 0;
    state.loadingTimer = setInterval(() => {
      state.loadingSeconds += 1;
      const el = document.getElementById('fabric-loading-timer');
      if (el) el.textContent = state.loadingSeconds + '秒';
    }, 1000);
  }

  // カウントアップタイマー停止
  function stopLoadingTimer() {
    if (state.loadingTimer) {
      clearInterval(state.loadingTimer);
      state.loadingTimer = null;
    }
  }

  async function startJudge() {
    if (!state.images.every(Boolean)) return;
    state.screen = 'loading';
    render();
    startLoadingTimer();

    try {
      const res = await fetch('/api/fabric-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: state.images }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `サーバーエラー (${res.status})`);
      }

      const data = await res.json();
      state.result = data;
      state.screen = 'result';
    } catch (e) {
      state.errorMsg = e.message;
      state.screen = 'error';
    }
    stopLoadingTimer();
    render();
  }

  function goKinuko(url) {
    window.location.href = url;
  }

  // ── 初期化 ──────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    render();
  });

  return { goTop, goGuide, goUpload, onImageSelect, startJudge, goKinuko };

})();
