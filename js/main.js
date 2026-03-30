/* ===========================
   長襦袢セルフ判定 - メインコントローラー
   =========================== */

const App = (() => {
  /* ── 状態管理 ── */
  const state = {
    screen:    'top',    // 'top' | 'guide' | 'question' | 'loading' | 'result' | 'detail' | 'caution' | 'consult'
    qIndex:    0,
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
        html = renderQuestion(getQuestionList()[state.qIndex], state.qIndex, state.answers, getQuestionList().length);
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
    state.answers = {};
    render();
  }

  function prevQuestion() {
    if (state.qIndex === 0) {
      state.screen = 'guide';
    } else {
      state.qIndex--;
      // Q1に戻ったとき、正絹専用回答をリセット
      const qList = getQuestionList();
      if (qList[state.qIndex]?.key === 'material') {
        delete state.answers.silkFabric;
        delete state.answers.fabric;
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

  // 表示する質問リストを動的に生成（正絹選択時はQ2sを使用、Q2をスキップ）
  // Q5で水通し経験なし・わからない場合はQ6をスキップ
  function getQuestionList() {
    let list;
    if (state.answers.material === 'silk') {
      // 正絹の場合：Q1 → Q2s（正絹専用）→ Q3以降
      list = QUESTIONS.filter(q => q.key !== 'fabric');
    } else {
      // 正絹以外：Q1 → Q2（通常）→ Q3以降（Q2sをスキップ）
      list = QUESTIONS.filter(q => q.key !== 'silkFabric');
    }

    // Q5で「したことはない」または「わからない」を選択した場合はQ6をスキップ
    const waterHistory = state.answers.waterHistory;
    if (waterHistory === 'no' || waterHistory === 'unknown') {
      list = list.filter(q => q.key !== 'pastResult');
      // Q6の回答をリセット（スキップしたのでスコアに影響させない）
      delete state.answers.pastResult;
    }

    return list;
  }

  function nextQuestion() {
    const qList = getQuestionList();
    const q = qList[state.qIndex];
    if (!state.answers[q.key]) return; // 未選択ならスキップ

    // Q1（素材）を回答した直後は質問リストが変わるので再計算
    const nextList = getQuestionList();

    if (state.qIndex + 1 >= nextList.length) {
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
