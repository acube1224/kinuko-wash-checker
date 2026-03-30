/* ===========================
   長襦袢セルフ判定 - メインコントローラー
   =========================== */

const App = (() => {
  /* ── 状態管理 ── */
  const state = {
    screen:    'top',    // 'top' | 'guide' | 'question' | 'loading' | 'result' | 'detail' | 'caution' | 'consult'
    qIndex:    0,
    mgIndex:   0,        // 素材推定4問のインデックス
    answers:   {},       // { key: choiceId }
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

  function selectChoice(key, id) {
    state.answers[key] = id;
    render();

    // 選択後、少し遅らせて次へボタンを有効化（すでにrenderで済んでいる）
    // スマホ向けに選択確認のフォーカスをスムーズに
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.disabled = false;
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
    if (state.answers.material === 'unknown' && isInMaterialGuess()) {
      if (state.mgIndex + 1 < MATERIAL_GUESS_QUESTIONS.length) {
        // 次の素材推定問へ
        state.mgIndex++;
        render();
        return;
      } else {
        // 4問完了 → 素材を推定してmaterialを上書き
        const guessed = guessMaterial();
        if (guessed === 'silk') {
          state.answers.material = 'silk';
        } else if (guessed === 'poly') {
          state.answers.material = 'other';
        } else {
          state.answers.material = 'mix';
        }
        state.mgIndex = 0;
        // materialGuessプレースホルダーの次へ進む
        state.qIndex++;
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
    // 親ページ（WordPress）へ高さを送信
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'kinuko-resize', height: h }, '*');
    }
  }

  // 画面変化のたびに高さを通知
  function observeHeight() {
    // ResizeObserver で動的な高さ変化を監視
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => notifyHeight());
      ro.observe(document.body);
    }
    // 念のためMutationObserverも併用
    const mo = new MutationObserver(() => notifyHeight());
    mo.observe(document.getElementById('app'), { childList: true, subtree: true });
  }

  /* ── 初期化 ── */
  function init() {
    render();
    observeHeight();
    // 初回ロード後に高さ通知
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
    showResult,
    resultAction,
    init
  };
})();

// 起動
document.addEventListener('DOMContentLoaded', () => App.init());
