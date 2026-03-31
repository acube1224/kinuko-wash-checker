/* ===========================
   長襦袢セルフ判定 - メインコントローラー
   =========================== */

const App = (() => {
  /* ── 状態管理 ── */
  const state = {
    screen:    'top',
    qIndex:    0,
    mgIndex:   0,
    mgActive:  false,       // 素材推定4問フェーズ中フラグ
    silkFabricUnknown: false, // Q2s「わからない」→Q2通常へ分岐中フラグ
    answers:   {},
    guessedMaterialLabel: null,
    result:    null,
    startTime: null         // 診断開始時刻
  };

  const $app = document.getElementById('app');

  /* ── レンダリング ── */
  function render() {
    let html = '';
    switch (state.screen) {
      case 'top':      html = renderTop();    break;
      case 'guide':    html = renderGuide();  break;
      case 'question':
        if (state.mgActive) {
          html = renderMgQuestion();
        } else {
          html = renderQuestion(getCurrentQuestion(), state.qIndex, state.answers, getTotalQuestionCount());
        }
        break;
      case 'loading':         html = renderLoading();                                    break;
      case 'result':          html = renderResult(state.result);                         break;
      case 'detail':          html = renderDetail(state.result);                         break;
      case 'caution':         html = renderCaution(state.result.grade, state.result.answers); break;
      case 'consult':         html = renderConsult(state.result.grade);                  break;
      case 'materialConfirm': html = renderMaterialConfirm(state.guessedMaterialLabel);  break;
    }
    $app.innerHTML = html;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'kinuko-scroll-top' }, '*');
    } else {
      window.scrollTo(0, 0);
    }
    setTimeout(() => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'kinuko-resize', height: document.body.scrollHeight }, '*');
      }
    }, 400);
  }

  /* ── 素材推定4問の専用レンダリング ── */
  function renderMgQuestion() {
    const q = MATERIAL_GUESS_QUESTIONS[state.mgIndex];
    const selected = state.answers[q.key] || null;
    const totalMg = MATERIAL_GUESS_QUESTIONS.length;
    const progress = Math.round((state.mgIndex / totalMg) * 100);
    const choicesHTML = q.choices.map(c => `
      <li>
        <button
          class="choice-btn ${selected === c.id ? 'selected' : ''}"
          data-key="${q.key}"
          data-id="${c.id}"
          onclick="App.selectChoiceMg('${q.key}', '${c.id}')"
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
    <p class="progress-label">素材を調べる ${state.mgIndex + 1} / ${totalMg}</p>
    <div class="progress-bar-track">
      <div class="progress-bar-fill" style="width:${progress}%"></div>
    </div>
  </div>
  <div class="content">
    <p class="question-no">素材チェック ${state.mgIndex + 1}</p>
    <h2 class="question-text">${q.text.replace(/\n/g, '<br>')}</h2>
    <div class="question-hint">${q.hint.replace(/\n/g, '<br>')}</div>
    <ul class="choice-list">${choicesHTML}</ul>
  </div>
  <div class="btn-footer">
    <button class="btn-primary" id="next-btn" onclick="App.nextQuestion()" ${selected ? '' : 'disabled'}>
      ${state.mgIndex + 1 < totalMg ? '次の質問へ' : '素材を判定する'}
    </button>
  </div>
</div>`;
  }

  /* ── 画面遷移 ── */
  function goTop() {
    state.screen  = 'top';
    state.qIndex  = 0;
    state.mgIndex = 0;
    state.mgActive = false;
    state.silkFabricUnknown = false;
    state.answers = {};
    state.result  = null;
    state.guessedMaterialLabel = null;
    render();
  }

  function goGuide() {
    state.screen = 'guide';
    render();
  }

  function startQuiz() {
    state.screen  = 'question';
    state.qIndex  = 0;
    state.mgIndex = 0;
    state.mgActive = false;
    state.silkFabricUnknown = false;
    state.answers = {};
    state.guessedMaterialLabel = null;
    state.startTime = Date.now(); // 診断開始時刻を記録
    render();
  }

  /* ── 戻るボタン ── */
  function prevQuestion() {
    // 素材推定4問フェーズ中
    if (state.mgActive) {
      if (state.mgIndex > 0) {
        const prevKey = MATERIAL_GUESS_QUESTIONS[state.mgIndex - 1].key;
        delete state.answers[prevKey];
        state.mgIndex--;
      } else {
        state.mgActive = false;
        state.mgIndex  = 0;
        MATERIAL_GUESS_QUESTIONS.forEach(q => delete state.answers[q.key]);
        state.qIndex = 0;
      }
      render();
      return;
    }

    if (state.qIndex === 0) {
      state.screen = 'guide';
      render();
      return;
    }

    // Q2（fabric）表示中 かつ silkFabricUnknown=true → Q2sに戻る
    const currentQ = getCurrentQuestion();
    if (state.silkFabricUnknown && currentQ && currentQ.key === 'fabric') {
      delete state.answers.fabric;
      state.silkFabricUnknown = false;
      // Q2s（silkFabric）の位置に戻す
      const silkList = getSilkQuestionList();
      const sfIdx = silkList.findIndex(q => q.key === 'silkFabric');
      state.qIndex = sfIdx !== -1 ? sfIdx : state.qIndex - 1;
      render();
      return;
    }

    state.qIndex--;
    // Q1に戻ったとき関連回答をリセット
    const list = getQuestionList();
    if (list[state.qIndex]?.key === 'material') {
      delete state.answers.silkFabric;
      delete state.answers.fabric;
      state.silkFabricUnknown = false;
      MATERIAL_GUESS_QUESTIONS.forEach(q => delete state.answers[q.key]);
      state.mgIndex  = 0;
      state.mgActive = false;
    }
    render();
  }

  /* ── 通常質問の選択 ── */
  function selectChoice(key, id) {
    state.answers[key] = id;
    render();
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.disabled = false;
  }

  /* ── 素材推定4問専用の選択（render不使用） ── */
  function selectChoiceMg(key, id) {
    state.answers[key] = id;
    document.querySelectorAll('.choice-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll(`.choice-btn[data-key="${key}"][data-id="${id}"]`).forEach(btn => {
      btn.classList.add('selected');
    });
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.disabled = false;
  }

  /* ═══════════════════════════════════
     質問リスト取得
     ─ 3種類のリストをフラグで切り分け
     ═══════════════════════════════════ */

  // 正絹ルート（Q2sなし→通常を含む場合）：常にsilkFabricを含む完全リスト
  function getSilkQuestionList() {
    // material=silk、silkFabricUnknown=false のときのリスト
    // [0]=material [1]=silkFabric [2]=tailoring ...
    let list = QUESTIONS.filter(q => q.key !== 'fabric' && q.key !== 'materialGuess');
    return applyWaterHistoryFilter(list);
  }

  // 正絹 + Q2s「わからない」→ fabric挿入ルート
  function getSilkWithFabricQuestionList() {
    // [0]=material [1]=silkFabric [2]=fabric [3]=tailoring ...
    let list = QUESTIONS.filter(q => q.key !== 'materialGuess');
    return applyWaterHistoryFilter(list);
  }

  // 混紡ルート
  function getMixQuestionList() {
    let list = QUESTIONS.filter(q => q.key !== 'silkFabric' && q.key !== 'materialGuess');
    return applyWaterHistoryFilter(list);
  }

  function applyWaterHistoryFilter(list) {
    const wh = state.answers.waterHistory;
    if (wh === 'no' || wh === 'unknown') {
      list = list.filter(q => q.key !== 'pastResult');
      delete state.answers.pastResult;
    }
    return list;
  }

  // 現在のstateに応じた質問リストを返す（共通エントリポイント）
  function getQuestionList() {
    const mat = state.answers.material;
    if (mat === 'silk') {
      return state.silkFabricUnknown ? getSilkWithFabricQuestionList() : getSilkQuestionList();
    }
    if (mat === 'mix') return getMixQuestionList();
    // Q1のみ
    return QUESTIONS.filter(q => q.key === 'material');
  }

  /* ── 現在表示すべき質問 ── */
  function getCurrentQuestion() {
    return getQuestionList()[state.qIndex] || null;
  }

  /* ── 全質問数 ── */
  function getTotalQuestionCount() {
    return getQuestionList().length;
  }

  /* ── 次の質問へ ── */
  function nextQuestion() {
    // 素材推定4問フェーズ中
    if (state.mgActive) {
      const currentMg = MATERIAL_GUESS_QUESTIONS[state.mgIndex];
      if (!currentMg || !state.answers[currentMg.key]) return;

      if (state.mgIndex + 1 < MATERIAL_GUESS_QUESTIONS.length) {
        state.mgIndex++;
        render();
        return;
      } else {
        const guessed = guessMaterial();
        const labelMap = { silk: '正絹（シルク）', poly: '化繊（ポリエステルなど）', mix: '混紡・綿・麻・ウール' };
        state.guessedMaterialLabel = { key: guessed, label: labelMap[guessed] || '混紡・綿・麻・ウール' };
        state.screen = 'materialConfirm';
        render();
        return;
      }
    }

    // 通常フェーズ
    const currentQ = getCurrentQuestion();
    if (!currentQ) return;
    if (!state.answers[currentQ.key]) return;

    // Q1：「わからない」→ 素材推定フェーズ
    if (currentQ.key === 'material' && state.answers.material === 'unknown') {
      state.mgActive = true;
      state.mgIndex  = 0;
      render();
      return;
    }

    // Q1：「化繊」→ 即A判定
    if (currentQ.key === 'material' && state.answers.material === 'other') {
      state.screen = 'loading';
      render();
      setTimeout(() => {
        state.result = calcJudgment(state.answers);
        saveLog(state.result);
        state.screen = 'result';
        render();
      }, 1600);
      return;
    }

    // Q1：「正絹」「混紡」→ Q2へ（qIndex=1）
    if (currentQ.key === 'material') {
      state.qIndex = 1;
      render();
      return;
    }

    // Q2s（正絹生地種類）：「わからない」→ silkFabricUnknownフラグを立てQ2（fabric）へ
    if (currentQ.key === 'silkFabric' && state.answers.silkFabric === 'unknown') {
      state.silkFabricUnknown = true;
      // getSilkWithFabricQuestionList でfabricのインデックスを取得
      const newList = getSilkWithFabricQuestionList();
      const fabricIdx = newList.findIndex(q => q.key === 'fabric');
      state.qIndex = fabricIdx !== -1 ? fabricIdx : state.qIndex + 1;
      render();
      return;
    }

    // Q2（fabric）：silkFabricUnknown=true（正絹「わからない」→Q2経由）→ Q3（仕立て）へ明示的に進む
    if (currentQ.key === 'fabric' && state.silkFabricUnknown) {
      const fullList = getSilkWithFabricQuestionList();
      const tailoringIdx = fullList.findIndex(q => q.key === 'tailoring');
      if (tailoringIdx !== -1) {
        state.qIndex = tailoringIdx;
        render();
        return;
      }
    }

    // 通常進行
    const list = getQuestionList();
    if (state.qIndex + 1 >= list.length) {

      state.screen = 'loading';
      render();
      setTimeout(() => {
        state.result = calcJudgment(state.answers);
        saveLog(state.result);
        state.screen = 'result';
        render();
      }, 1600);
    } else {
      state.qIndex++;
      render();
    }
  }

  /* ── 素材推定ロジック ── */
  function guessMaterial() {
    let silk = 0, poly = 0, mix = 0;
    MATERIAL_GUESS_QUESTIONS.forEach(q => {
      const answerId = state.answers[q.key];
      if (!answerId) return;
      const choice = q.choices.find(c => c.id === answerId);
      if (!choice || !choice.point) return;
      if (choice.point.silk) silk += choice.point.silk;
      if (choice.point.poly) poly += choice.point.poly;
      if (choice.point.mix)  mix  += choice.point.mix;
    });
    if (silk >= 3) return 'silk';
    if (poly >= 3) return 'poly';
    if (mix  >= 3) return 'mix';
    if (silk >= 2 && silk > poly && silk > mix) return 'silk';
    if (poly >= 2 && poly > silk && poly > mix) return 'poly';
    return 'mix';
  }

  /* ── 素材推定確認画面のアクション ── */
  function confirmMaterial(accepted) {
    if (accepted) {
      const guessed = state.guessedMaterialLabel.key;
      state.guessedMaterialLabel = null;
      state.mgActive = false;
      state.mgIndex  = 0;

      if (guessed === 'poly') {
        state.answers.material = 'other';
        state.screen = 'loading';
        render();
        setTimeout(() => {
          state.result = calcJudgment(state.answers);
          saveLog(state.result);
          state.screen = 'result';
          render();
        }, 1600);
        return;
      }
      state.answers.material = (guessed === 'silk') ? 'silk' : 'mix';
      state.screen = 'question';
      state.qIndex = 1;
      render();
    } else {
      MATERIAL_GUESS_QUESTIONS.forEach(q => delete state.answers[q.key]);
      state.mgIndex  = 0;
      state.mgActive = true;
      state.guessedMaterialLabel = null;
      state.screen = 'question';
      render();
    }
  }

  function showResult() {
    if (state.result) { state.screen = 'result'; render(); }
  }

  function resultAction(action) {
    switch (action) {
      case 'detail':  state.screen = 'detail';  render(); break;
      case 'caution': state.screen = 'caution'; render(); break;
      case 'consult': state.screen = 'consult'; render(); break;
      case 'retry':   goTop(); break;
    }
  }

  /* ── 診断ログ保存 ── */
  function saveLog(result) {
    try {
      const duration = state.startTime
        ? Math.round((Date.now() - state.startTime) / 1000)
        : null;
      const sessionId = 'ks_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const payload = {
        grade:            result.grade,
        score:            result.score,
        duration_sec:     duration,
        session_id:       sessionId,
        ans_material:     result.answers.material      || null,
        ans_silk_fabric:  result.answers.silkFabric    || null,
        ans_fabric:       result.answers.fabric        || null,
        ans_tailoring:    result.answers.tailoring     || null,
        ans_decoration:   result.answers.decoration    || null,
        ans_water_history:result.answers.waterHistory  || null,
        ans_past_result:  result.answers.pastResult    || null,
        ans_color:        result.answers.color         || null
      };
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {}); // エラーは無視（ユーザーへの影響なし）
    } catch (e) {
      // ログ保存失敗はサイレントに無視
    }
  }

  /* ── iframe高さ自動通知 ── */
  function notifyHeight() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'kinuko-resize', height: document.body.scrollHeight }, '*');
    }
  }

  function observeHeight() {
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => notifyHeight()).observe(document.body);
    }
    new MutationObserver(() => notifyHeight()).observe(
      document.getElementById('app'), { childList: true, subtree: true }
    );
  }

  function init() {
    render();
    observeHeight();
    setTimeout(notifyHeight, 300);
  }

  return {
    goTop, goGuide, startQuiz,
    prevQuestion, selectChoice, selectChoiceMg,
    nextQuestion, confirmMaterial,
    showResult, resultAction, init
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
