/* ===========================
   長襦袢セルフ判定 - 判定ロジック
   =========================== */

/**
 * 回答から判定スコアを計算し、A/B/Cを返す
 * @param {Object} answers - { key: choiceId }
 * @returns {Object} { grade, score, chips, detailNotes }
 */
function calcJudgment(answers) {
  let score = 0;
  const chips = [];
  const detailNotes = [];

  QUESTIONS.forEach(q => {
    const answerId = answers[q.key];
    if (!answerId) return;

    const choice = q.choices.find(c => c.id === answerId);
    if (choice) score += choice.score;

    // チップ生成
    const chipKey = `${q.key}_${answerId}`;
    if (REASON_CHIPS[chipKey]) {
      chips.push({ ...REASON_CHIPS[chipKey], key: chipKey });
    }

    // 詳細注記
    if (DETAIL_NOTES[chipKey]) {
      detailNotes.push(DETAIL_NOTES[chipKey]);
    }
  });

  // --- オプション補正 ---

  // ガード加工（パールトーン）あり → スコア -3
  if (answers.optionGuard) {
    score -= 3;
    chips.push({ ...REASON_CHIPS['option_guard'], key: 'option_guard' });
  }

  // ビンテージ → スコア +5
  if (answers.optionVintage) {
    score += 5;
    chips.push({ ...REASON_CHIPS['option_vintage'], key: 'option_vintage' });
  }

  // --- 特殊ルール（強制上書き） ---

  // 素材が化繊（ポリ・シルック） → 即A（他の条件より優先）
  if (answers.material === 'other') {
    return buildResult('A', score, chips, detailNotes, answers);
  }

  // ビンテージON かつ 化繊以外 → 最低でもB（スコア3以上を保証）
  // 化繊はビンテージでも洗えるため除外済み
  if (answers.optionVintage && score < 3) {
    score = 3;
  }

  // 正絹の場合：silkFabricの縮緬 → 即C
  if (answers.material === 'silk' && answers.silkFabric === 'chirimen') {
    return buildResult('C', score, chips, detailNotes, answers);
  }

  // 正絹以外の場合：Q2のちりめん → 即C
  // 正絹でもQ2s「わからない」→Q2でちりめん凹凸を選んだ場合も即C
  if (answers.fabric === 'crepe') {
    return buildResult('C', score, chips, detailNotes, answers);
  }

  // 生地が裂けた → 即 C
  if (answers.pastResult === 'torn') {
    return buildResult('C', score, chips, detailNotes, answers);
  }

  // 過去に大きく縮んだOR色にじみ実績あり → 最低B
  if (answers.pastResult === 'shrink' || answers.pastResult === 'color') {
    if (score < 6) score = 6;
  }

  // 繊細装飾あり → 最低B
  if (answers.decoration === 'yes') {
    if (score < 5) score = 5;
  }

  // 判定閾値
  let grade;
  if (score <= 2) {
    grade = 'A';
  } else if (score <= 7) {
    grade = 'B';
  } else {
    grade = 'C';
  }

  return buildResult(grade, score, chips, detailNotes, answers);
}


/**
 * 判定結果オブジェクトを生成
 */
function buildResult(grade, score, chips, detailNotes, answers) {
  // チップを danger → caution → safe → neutral の順に優先整理
  const sorted = sortChips(chips);

  // 理由チップは最大5個まで
  const topChips = pickReasonChips(sorted, answers);

  return { grade, score, chips: topChips, detailNotes, answers };
}


/**
 * 理由チップを重要度順に整理して最大5個を返す
 */
function pickReasonChips(chips, answers) {
  // danger を先頭、safe を後回しにする
  const priority = { danger: 0, caution: 1, neutral: 2, safe: 3 };
  const sorted = [...chips].sort((a, b) => priority[a.type] - priority[b.type]);

  // ガード加工チップは必ず表示する（safeで押し出されないよう確保）
  const guardChip = chips.find(c => c.key === 'option_guard');
  if (guardChip) {
    const without = sorted.filter(c => c.key !== 'option_guard');
    return [guardChip, ...without].slice(0, 5);
  }

  return sorted.slice(0, 5);
}


/**
 * チップをtype別に並び替え
 */
function sortChips(chips) {
  const order = { danger: 0, caution: 1, neutral: 2, safe: 3 };
  return [...chips].sort((a, b) => (order[a.type] ?? 4) - (order[b.type] ?? 4));
}


/* === 各判定グレードのコンテンツ === */
const RESULT_CONTENT = {
  A: {
    badge:    '洗える候補',
    badgeClass: 'badge-a',
    barClass:   'bar-a',
    icon:     '✅',
    title:    '自宅でやさしく洗える候補です',
    desc:     '今回の回答内容から見ると、自宅でのやさしい手洗いを検討しやすいタイプです。生地や仕立ての面で大きなリスクは比較的少なく、過去の洗い履歴にも強い不安材料が少ない可能性があります。',
    reasonTitle: 'この判定になった主な理由',
    recommend: '短時間・やさしい手洗いで、無理のないケアをご検討ください。',
    buttons: [
      { label: '洗う前の注意点を見る', action: 'caution',  style: 'skyblue' },
      { label: '判定理由を詳しく見る',  action: 'detail',   style: 'orange' },
      { label: '最初からやり直す',          action: 'retry',    style: 'secondary' }
    ]
  },
  B: {
    badge:    '注意して検討',
    badgeClass: 'badge-b',
    barClass:   'bar-b',
    icon:     '⚠️',
    title:    '注意して検討したいお品です',
    desc:     '今回の回答内容から見ると、自宅で洗えないとは言い切れないものの、注意して判断が必要なタイプです。生地の薄さ、仕立ての特徴、色の濃さ、過去の履歴などに、やや注意したい要素が含まれています。\n\n自宅で試す場合でも、無理をせず、できるだけ注意して判断するのが安心です。',
    reasonTitle: '注意して見たいポイント',
    recommend: 'まずは目立たない部分で確認し、不安があれば自宅洗いは見送るのがおすすめです。',
    buttons: [
      { label: '洗う前の注意点を見る',  action: 'caution',  style: 'skyblue' },
      { label: '判定理由を詳しく見る',   action: 'detail',   style: 'orange' },
      { label: '最初からやり直す',           action: 'retry',    style: 'secondary' }
    ]
  },
  C: {
    badge:    '自宅洗い非推奨',
    badgeClass: 'badge-c',
    barClass:   'bar-c',
    icon:     '🚫',
    title:    '自宅洗いは避けたいお品です',
    desc:     '今回の回答内容から見ると、この長襦袢は自宅での洗濯による負担が大きくなりやすいタイプです。生地、色、加工、仕立て、または過去の洗い履歴から、縮み、縫い目のつれ、色落ち、風合い変化などのリスクが高めと考えられます。\n\n無理に自宅で洗わないほうが安心です。大切なお品ほど、専門店への相談をおすすめします。',
    reasonTitle: '自宅洗いを避けたい主な理由',
    recommend: '自宅洗いは行わず、専門店への相談をご検討ください。',
    buttons: [
      { label: '判定理由を詳しく見る', action: 'detail',  style: 'orange' },
      { label: '最初からやり直す',     action: 'retry',   style: 'secondary' }
    ]
  }
};
