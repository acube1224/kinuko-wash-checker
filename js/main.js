/* ===========================
   長襦袢セルフ判定 - メインコントローラー
   =========================== */

const App = (() => {
  /* ── 状態管理 ── */
  const state = {
    screen:    'top',    // 'top' | 'guide' | 'question' | 'loading' | 'result' | 'detail' | 'caution' | 'consult' | 'materialConfirm'
    qIndex:    0,
    mgIndex:   0,        // 素材推定4問のインデックス
    answers:   {},       // { key: choiceId }
    guessedMaterialLabel: null, // 素材推定結果のラベル（確認画面用）
    result:    null      // calcJudgment() の返り値
  };

  const $app = document.getElementById('app');

  /* ── レンダリング ── */
  function render() {
    let html = '';

    switch (state.screen) {
      case 'top':
        html = renderTop();
        break;
      case 'guide':
        html = renderGuide();
        break;
      case 'question':
        html = renderQuestion(getCurrentQuestion(), state.qIndex, state.answers, getTotalQuestionCount());
        break;
      case 'loading':
        html = renderLoading();
        break;
      case 'result':
        html = renderResult(state.result);
        break;
      case 'detail':
        html = renderDetail(state.result);
        break;
      case 'caution':
        html = renderCaution(state.result.grade);
        break;
      case 'consult':
        html = renderConsult(state.result.grade);
        break;
      case 'materialConfirm':
        html = renderMaterialConfirm(state.guessedMaterialLabel);
        break;
    }

    $app.innerHTML = html;
    // iframe内ではトップへのスクロールを親に依頼
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'kinuko-scroll-top' }, '*');
    } else {
      window.scrollTo(0, 0);
    }
    // 画面切替後に高さ再通知
    setTimeout(() => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'kinuko-resize', height: document.body.scrollHeight }, '*');
      }
    }, 400);
  }

  /* ── 画面遷移 ── */
  function goTop() {
    state.screen  = 'top';
    state.qIndex  = 0;
    state.answers = {};
    state.result  = null;
    state.mgIndex = 0;
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
    state.answers = {};
    state.guessedMaterialLabel = null;
    render();
  }

  function prevQuestion() {
    // 素材推定4問中の場合
    if (state.answers.material === 'unknown' && isInMaterialGuess()) {
      if (state.mgIndex > 0) {
        // 前の素材推定問へ
        const prevKey = MATERIAL_GUESS_QUESTIONS[state.mgIndex - 1].key;
        delete state.answers[prevKey];
        state.mgIndex--;
      } else {
        // 素材推定の最初 → Q1へ戻る
        state.qIndex = 0;
        state.mgIndex = 0;
        delete state.answers.material;
        MATERIAL_GUESS_QUESTIONS.forEach(q => delete state.answers[q.key]);
      }
      render();
      return;
    }

    if (state.qIndex === 0) {
      state.screen = 'guide';
    } else {
      state.qIndex--;
      // Q1に戻ったとき関連回答をリセット
      const qList = getMainQuestionList();
      if (qList[state.qIndex]?.key === 'material') {
        delete state.answers.silkFabric;
        delete state.answers.fabric;
        MATERIAL_GUESS_QUESTIONS.forEach(q => delete state.answers[q.key]);
        state.mgIndex = 0;
      }
    }
    render();
  }

  // ── selectChoice: 素材推定フェーズ中はrender()を呼ばない ──
  // render()内でguessMaterial()が呼ばれ、途中回答状態で誤判定が起きるのを防ぐ
  function selectChoice(key, id) {
    state.answers[key] = id;

    // 素材推定4問フェーズ中はDOMを直接操作してselected表示を更新
    if (state.answers.material === 'unknown' && isInMaterialGuessRaw()) {
      document.querySelectorAll('.choice-btn').forEach(btn => {
        btn.classList.remove('selected');
      });
      document.querySelectorAll(`.choice-btn[data-key="${key}"][data-id="${id}"]`).forEach(btn => {
        btn.classList.add('selected');
      });
      const nextBtn = document.getElementById('next-btn');
      if (nextBtn) nextBtn.disabled = false;
      return;
    }

    render();
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.disabled = false;
  }

  // メイン質問リスト（素材推定4問を除く）
  // ※ guessMaterial()を呼ばない安全バージョン（素材推定フェーズ検出用）
  function getMainQuestionListSafe() {
    let list;
    const mat = state.answers.material;

    if (mat === 'other') {
      list = QUESTIONS.filter(q => q.key === 'material');
    } else if (mat === 'silk') {
      list = QUESTIONS.filter(q => q.key !== 'fabric' && q.key !== 'materialGuess');
    } else if (mat === 'mix') {
      list = QUESTIONS.filter(q => q.key !== 'silkFabric' && q.key !== 'materialGuess');
    } else if (mat === 'unknown') {
      // わからない → materialGuessプレースホルダーを含むルート
      list = QUESTIONS.filter(q => q.key !== 'fabric' && q.key !== 'silkFabric');
    } else {
      list = QUESTIONS.filter(q => q.key !== 'silkFabric' && q.key !== 'materialGuess');
    }

    const waterHistory = state.answers.waterHistory;
    if (waterHistory === 'no' || waterHistory === 'unknown') {
      list = list.filter(q => q.key !== 'pastResult');
    }

    return list;
  }

  // 素材推定4問フェーズ中かどうか（guessMaterial不使用）
  function isInMaterialGuessRaw() {
    if (state.answers.material !== 'unknown') return false;
    const mainList = getMainQuestionListSafe();
    const mgPlaceholderIndex = mainList.findIndex(q => q.key === 'materialGuess');
    return mgPlaceholderIndex !== -1 && state.qIndex === mgPlaceholderIndex;
  }

  // メイン質問リスト（素材推定4問を除く）
  function getMainQuestionList() {
    const guessedMaterial = guessMaterial();
    let list;

    if (state.answers.material === 'other') {
      // 化繊：Q1のみ
      list = QUESTIONS.filter(q => q.key === 'material');
    } else if (state.answers.material === 'silk' ||
              (state.answers.material === 'unknown' && guessedMaterial === 'silk')) {
      // 正絹：Q1 → Q2s → Q3以降
      list = QUESTIONS.filter(q => q.key !== 'fabric' && q.key !== 'materialGuess');
    } else if (state.answers.material === 'unknown') {
      // わからない（推定中 or 混紡）：Q1 → materialGuess → Q3以降
      list = QUESTIONS.filter(q => q.key !== 'fabric' && q.key !== 'silkFabric');
    } else {
      // 正絹以外（混紡）：Q1 → Q2（通常）→ Q3以降
      list = QUESTIONS.filter(q => q.key !== 'silkFabric' && q.key !== 'materialGuess');
    }

    // Q5で「したことはない」または「わからない」を選択した場合はQ6をスキップ
    const waterHistory = state.answers.waterHistory;
    if (waterHistory === 'no' || waterHistory === 'unknown') {
      list = list.filter(q => q.key !== 'pastResult');
      delete state.answers.pastResult;
    }

    return list;
  }

  // 素材推定4問フェーズ中かどうか
  function isInMaterialGuess() {
    const mainList = getMainQuestionList();
    const mgPlaceholderIndex = mainList.findIndex(q => q.key === 'materialGuess');
    return mgPlaceholderIndex !== -1 && state.qIndex === mgPlaceholderIndex;
  }

  // 素材推定4問の回答からmaterialを推定
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
    if (mix >= 3)  return 'mix';
    if (silk >= 2 && silk > poly && silk > mix) return 'silk';
    if (poly >= 2 && poly > silk && poly > mix) return 'poly';
    return 'mix';
  }

  // 現在表示すべき質問を返す
  function getCurrentQuestion() {
    const mainList = getMainQuestionList();
    const q = mainList[state.qIndex];
    // materialGuessプレースホルダーのとき → MATERIAL_GUESS_QUESTIONSから取得
    if (q && q.key === 'materialGuess') {
      return MATERIAL_GUESS_QUESTIONS[state.mgIndex];
    }
    return q;
  }

  // 全質問数を返す（素材推定4問の場合はその分も含む）
  function getTotalQuestionCount() {
    const mainList = getMainQuestionList();
    const hasMg = mainList.some(q => q.key === 'materialGuess');
    return hasMg ? mainList.length - 1 + MATERIAL_GUESS_QUESTIONS.length : mainList.length;
  }

  function nextQuestion() {
    const currentQ = getCurrentQuestion();
    if (!currentQ) return;
    if (!state.answers[currentQ.key]) return; // 未選択ならスキップ

    // 素材推定4問フェーズ中の場合
    if (state.answers.material === 'unknown' && isInMaterialGuessRaw()) {
      if (state.mgIndex + 1 < MATERIAL_GUESS_QUESTIONS.length) {
        // 次の素材推定問へ
        state.mgIndex++;
        render();
        return;
      } else {
        // 4問完了 → 確認画面へ遷移
        const guessed = guessMaterial();
        const labelMap = {
          silk: '正絹（シルク）',
          poly: '化繊（ポリエステルなど）',
          mix:  '混紡・綿・麻・ウール'
        };
        state.guessedMaterialLabel = { key: guessed, label: labelMap[guessed] || '混紡・綿・麻・ウール' };
        state.screen = 'materialConfirm';
        render();
        return;
      }
    }

    const mainList = getMainQuestionList();

    if (state.qIndex + 1 >= mainList.length) {
      // 全問完了 → ローディング → 結果
      state.screen = 'loading';
      render();
      setTimeout(() => {
        state.result = calcJudgment(state.answers);
        state.screen = 'result';
        render();
      }, 1600);
    } else {
      state.qIndex++;
      render();
    }
  }

  /* ── 素材推定確認画面のアクション ── */
  function confirmMaterial(accepted) {
    if (accepted) {
      const guessed = state.guessedMaterialLabel.key;

      // answers.materialを変える前に、materialGuessのインデックスを取得
      // この時点ではまだ material === 'unknown' なので getMainQuestionListSafe() が正しく動く
      const mainListBefore = getMainQuestionListSafe();
      const mgIdx = mainListBefore.findIndex(q => q.key === 'materialGuess');

      state.guessedMaterialLabel = null;
      state.mgIndex = 0;

      if (guessed === 'poly') {
        // 化繊 → 即A判定へ
        state.answers.material = 'other';
        state.screen = 'loading';
        render();
        setTimeout(() => {
          state.result = calcJudgment(state.answers);
          state.screen = 'result';
          render();
        }, 1600);
        return;
      }

      // 正絹 or 混紡 → 次の質問へ
      state.answers.material = (guessed === 'silk') ? 'silk' : 'mix';
      state.screen = 'question';
      state.qIndex = (mgIdx !== -1) ? mgIdx + 1 : 1;
      render();

    } else {
      // 「いいえ」→ 素材推定4問の最初に戻る
      // answers.material は 'unknown' のままにして4問を再度表示
      MATERIAL_GUESS_QUESTIONS.forEach(q => delete state.answers[q.key]);
      state.mgIndex = 0;
      state.guessedMaterialLabel = null;
      state.screen = 'question';
      // materialGuessプレースホルダーの位置に戻す
      const mainList = getMainQuestionListSafe(); // material==='unknown' のリスト
      const mgIdx = mainList.findIndex(q => q.key === 'materialGuess');
      state.qIndex = (mgIdx !== -1) ? mgIdx : 1;
      render();
    }
  }

  function showResult() {
    if (state.result) {
      state.screen = 'result';
      render();
    }
  }

  function resultAction(action) {
    switch (action) {
      case 'detail':
        state.screen = 'detail';
        render();
        break;
      case 'caution':
        state.screen = 'caution';
        render();
        break;
      case 'consult':
        state.screen = 'consult';
        render();
        break;
      case 'retry':
        goTop();
        break;
    }
  }

  /* ── iframe高さ自動通知 ── */
  function notifyHeight() {
    const h = document.body.scrollHeight;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'kinuko-resize', height: h }, '*');
    }
  }

  function observeHeight() {
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => notifyHeight());
      ro.observe(document.body);
    }
    const mo = new MutationObserver(() => notifyHeight());
    mo.observe(document.getElementById('app'), { childList: true, subtree: true });
  }

  /* ── 初期化 ── */
  function init() {
    render();
    observeHeight();
    setTimeout(notifyHeight, 300);
  }

  /* ── 公開API ── */
  return {
    goTop,
    goGuide,
    startQuiz,
    prevQuestion,
    selectChoice,
    nextQuestion,
    confirmMaterial,
    showResult,
    resultAction,
    init
  };
})();

// 起動
document.addEventListener('DOMContentLoaded', () => App.init());
