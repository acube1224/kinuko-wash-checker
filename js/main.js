/* ===========================
   長襦袢セルフ判定 - メインコントローラー
   =========================== */

const App = (() => {
  /* ── 状態管理 ── */
  const state = {
    screen:    'top',    // 'top' | 'guide' | 'question' | 'loading' | 'result' | 'detail' | 'caution' | 'consult' | 'materialConfirm'
    qIndex:    0,
    mgIndex:   0,        // 素材推定4問のインデックス（0〜3）
    mgActive:  false,    // 素材推定4問フェーズ中フラグ（このフラグで全分岐を制御）
    answers:   {},       // { key: choiceId }
    guessedMaterialLabel: null, // 素材推定結果のラベル（確認画面用）
    result:    null      // calcJudgment() の返り値
  };

  const $app = document.getElementById('app');

  /* ── レンダリング ── */
  function render() {
    let html = '';

    switch (state.screen) {
      case 'top':      html = renderTop();                               break;
      case 'guide':    html = renderGuide();                             break;
      case 'question':
        if (state.mgActive) {
          // 素材推定4問フェーズ：専用レンダリング
          html = renderMgQuestion();
        } else {
          html = renderQuestion(getCurrentQuestion(), state.qIndex, state.answers, getTotalQuestionCount());
        }
        break;
      case 'loading':         html = renderLoading();                                break;
      case 'result':          html = renderResult(state.result);                     break;
      case 'detail':          html = renderDetail(state.result);                     break;
      case 'caution':         html = renderCaution(state.result.grade);              break;
      case 'consult':         html = renderConsult(state.result.grade);              break;
      case 'materialConfirm': html = renderMaterialConfirm(state.guessedMaterialLabel); break;
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

  /* ── 素材推定4問の専用レンダリング ──
     render()内でguessMaterial()が絶対に呼ばれない独立した描画 */
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
    state.answers = {};
    state.guessedMaterialLabel = null;
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
        // 素材推定の最初 → Q1へ戻る
        state.mgActive = false;
        state.mgIndex = 0;
        MATERIAL_GUESS_QUESTIONS.forEach(q => delete state.answers[q.key]);
        state.qIndex = 0; // Q1
      }
      render();
      return;
    }

    if (state.qIndex === 0) {
      state.screen = 'guide';
    } else {
      state.qIndex--;
      const qList = getMainQuestionList();
      // Q1に戻ったとき関連回答をリセット
      if (qList[state.qIndex]?.key === 'material') {
        delete state.answers.silkFabric;
        delete state.answers.fabric;
        MATERIAL_GUESS_QUESTIONS.forEach(q => delete state.answers[q.key]);
        state.mgIndex = 0;
        state.mgActive = false;
      }
      // Q2（通常生地）から戻るとき：正絹ルートでsilkFabricが'unknown'の場合は、Q2sに戻る
      if (state.answers.material === 'silk' && state.answers.silkFabric === 'unknown') {
        const list = getPostMaterialQuestionList();
        const curKey = list[state.qIndex]?.key;
        if (curKey === 'fabric') {
          // fabricを削除してQ2sの位置へ
          delete state.answers.fabric;
          const silkList = QUESTIONS.filter(q => q.key !== 'fabric' && q.key !== 'materialGuess');
          const silkFabricIdx = silkList.findIndex(q => q.key === 'silkFabric');
          state.qIndex = silkFabricIdx !== -1 ? silkFabricIdx : state.qIndex;
        }
      }
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

  /* ── 素材推定4問専用の選択（render不使用・DOM直接操作） ── */
  function selectChoiceMg(key, id) {
    state.answers[key] = id;
    // render()を呼ばずにDOMだけ更新
    document.querySelectorAll('.choice-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll(`.choice-btn[data-key="${key}"][data-id="${id}"]`).forEach(btn => {
      btn.classList.add('selected');
    });
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.disabled = false;
  }

  /* ── メイン質問リスト（素材推定プレースホルダーなし版） ── */
  // mgActiveがtrueのときは呼ばれないので、guessMaterial()との干渉なし
  function getMainQuestionList() {
    const mat = state.answers.material;
    let list;

    if (mat === 'other') {
      // 化繊：Q1のみ
      list = QUESTIONS.filter(q => q.key === 'material');
    } else if (mat === 'silk') {
      // 正絹：Q1 → Q2s → Q3以降
      list = QUESTIONS.filter(q => q.key !== 'fabric' && q.key !== 'materialGuess');
    } else if (mat === 'mix') {
      // 混紡：Q1 → Q2（通常）→ Q3以降
      list = QUESTIONS.filter(q => q.key !== 'silkFabric' && q.key !== 'materialGuess');
    } else if (mat === 'unknown') {
      // わからない（素材推定フェーズ開始前のQ1表示、またはQ1への戻り）
      // materialGuessプレースホルダーは除去してQ1だけ表示
      list = QUESTIONS.filter(q => q.key === 'material');
    } else {
      // null / undefined（初期状態）：Q1だけ
      list = QUESTIONS.filter(q => q.key === 'material');
    }

    // Q5で「したことはない」または「わからない」を選択した場合はQ6をスキップ
    const waterHistory = state.answers.waterHistory;
    if (waterHistory === 'no' || waterHistory === 'unknown') {
      list = list.filter(q => q.key !== 'pastResult');
      delete state.answers.pastResult;
    }

    return list;
  }

  /* ── 素材確定後の質問リスト（Q2以降）── */
  function getPostMaterialQuestionList() {
    const mat = state.answers.material;
    let list;

    if (mat === 'silk') {
      // 正絹ルート：Q1 → Q2s → Q3以降
      // Q2sで「わからない」を選んだ場合は fabric（通常生地質問）も挿入
      if (state.answers.silkFabric === 'unknown') {
        // Q2s → Q2（通常）→ Q3以降
        list = QUESTIONS.filter(q => q.key !== 'materialGuess');
      } else {
        // Q2s → Q3以降（fabricは不要）
        list = QUESTIONS.filter(q => q.key !== 'fabric' && q.key !== 'materialGuess');
      }
    } else {
      // 混紡ルート：Q1 → Q2（通常）→ Q3以降
      list = QUESTIONS.filter(q => q.key !== 'silkFabric' && q.key !== 'materialGuess');
    }

    const waterHistory = state.answers.waterHistory;
    if (waterHistory === 'no' || waterHistory === 'unknown') {
      list = list.filter(q => q.key !== 'pastResult');
      delete state.answers.pastResult;
    }

    return list;
  }

  /* ── 現在表示すべき質問を返す（mgActiveがfalseのとき） ── */
  function getCurrentQuestion() {
    const mat = state.answers.material;
    // 素材確定後（silk / mix）は postList を使う
    if (mat === 'silk' || mat === 'mix') {
      return getPostMaterialQuestionList()[state.qIndex] || null;
    }
    // Q1表示中（material未回答 / other / unknown）
    return getMainQuestionList()[state.qIndex] || null;
  }

  /* ── 全質問数 ── */
  function getTotalQuestionCount() {
    const mat = state.answers.material;
    if (mat === 'silk' || mat === 'mix') {
      return getPostMaterialQuestionList().length;
    }
    return getMainQuestionList().length;
  }

  /* ── 次の質問へ ── */
  function nextQuestion() {
    // 素材推定4問フェーズ中
    if (state.mgActive) {
      const currentMg = MATERIAL_GUESS_QUESTIONS[state.mgIndex];
      if (!currentMg || !state.answers[currentMg.key]) return; // 未選択ガード

      if (state.mgIndex + 1 < MATERIAL_GUESS_QUESTIONS.length) {
        // 次の素材推定問へ
        state.mgIndex++;
        render();
        return;
      } else {
        // 4問完了 → 確認画面へ
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

    // 通常フェーズ
    const currentQ = getCurrentQuestion();
    if (!currentQ) return;
    if (!state.answers[currentQ.key]) return; // 未選択ガード

    // Q1で「わからない」→ 素材推定フェーズ開始
    if (currentQ.key === 'material' && state.answers.material === 'unknown') {
      state.mgActive = true;
      state.mgIndex  = 0;
      render();
      return;
    }

    // Q1で「化繊」→ 即A判定
    if (currentQ.key === 'material' && state.answers.material === 'other') {
      state.screen = 'loading';
      render();
      setTimeout(() => {
        state.result = calcJudgment(state.answers);
        state.screen = 'result';
        render();
      }, 1600);
      return;
    }

    // Q1で「正絹」または「混紡」→ Q2以降へ（qIndexを素材確定後リストで管理）
    if (currentQ.key === 'material') {
      // material確定後のリストに切り替えてQ2（index=1）へ
      state.qIndex = 1;
      render();
      return;
    }

    // Q2以降の通常進行
    const list = getPostMaterialQuestionList();

    // Q2sで「わからない」を選んだ → Q2（通常生地特徴）へ長ぶ
    if (currentQ.key === 'silkFabric' && state.answers.silkFabric === 'unknown') {
      // リストが再構築される（fabricが挿入される）ので、fabricのインデックスを取得
      const newList = getPostMaterialQuestionList();
      const fabricIdx = newList.findIndex(q => q.key === 'fabric');
      state.qIndex = fabricIdx !== -1 ? fabricIdx : state.qIndex + 1;
      render();
      return;
    }

    if (state.qIndex + 1 >= list.length) {
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

  /* ── 素材推定4問の推定ロジック ── */
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
        // 化繊 → 即A判定
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

      // 正絹 or 混紡 → Q2以降へ
      state.answers.material = (guessed === 'silk') ? 'silk' : 'mix';
      state.screen = 'question';
      state.qIndex = 1; // Q2（index=1）から開始
      render();

    } else {
      // 「いいえ」→ 素材推定4問の最初に戻る
      MATERIAL_GUESS_QUESTIONS.forEach(q => delete state.answers[q.key]);
      state.mgIndex  = 0;
      state.mgActive = true; // 引き続き素材推定フェーズ
      state.guessedMaterialLabel = null;
      state.screen = 'question';
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
      case 'detail':  state.screen = 'detail';  render(); break;
      case 'caution': state.screen = 'caution'; render(); break;
      case 'consult': state.screen = 'consult'; render(); break;
      case 'retry':   goTop(); break;
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
    selectChoiceMg,
    nextQuestion,
    confirmMaterial,
    showResult,
    resultAction,
    init
  };
})();

// 起動
document.addEventListener('DOMContentLoaded', () => App.init());
