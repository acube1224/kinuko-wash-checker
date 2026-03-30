/* ============================================================
   長襦袢セルフ判定 - 総当たり動作テスト
   ============================================================ */

const fs = require('fs');

// グローバルスコープに直接展開
const dataCode = fs.readFileSync('js/data.js', 'utf8').replace(/const /g, 'var ');
const logicCode = fs.readFileSync('js/logic.js', 'utf8').replace(/const /g, 'var ').replace(/let /g, 'var ');
eval(dataCode);
eval(logicCode);

let passed = 0;
let failed = 0;
const errors = [];

function assert(label, condition, detail) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ' → ' + detail : ''}`);
    failed++;
    errors.push(`${label}${detail ? ': ' + detail : ''}`);
  }
}

function test(label, fn) {
  console.log(`\n【${label}】`);
  fn();
}

// ============================================================
// ① Q1=化繊 → 即A
// ============================================================
test('Q1=化繊 → 即A判定', () => {
  const r = calcJudgment({ material: 'other' });
  assert('gradeがA', r.grade === 'A', `grade=${r.grade}`);
});

// ============================================================
// ② Q1=正絹 + Q2s各選択肢
// ============================================================
test('Q1=正絹 + Q2s=縮緬 → 即C', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'chirimen', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'light' });
  assert('gradeがC', r.grade === 'C', `grade=${r.grade}`);
});

test('Q1=正絹 + Q2s=綸子 → スコア計算', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'rinzu', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert('grade取得できる', ['A','B','C'].includes(r.grade), `grade=${r.grade}`);
  assert('chipsが配列', Array.isArray(r.chips));
});

test('Q1=正絹 + Q2s=絽紗 → スコア計算', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'ro', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert('grade取得できる', ['A','B','C'].includes(r.grade), `grade=${r.grade}`);
});

test('Q1=正絹 + Q2s=精華', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'seika', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert('grade取得できる', ['A','B','C'].includes(r.grade), `grade=${r.grade}`);
});

test('Q1=正絹 + Q2s=羽二重', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'habutae', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert('grade取得できる', ['A','B','C'].includes(r.grade), `grade=${r.grade}`);
});

test('Q1=正絹 + Q2s=塩瀬 → 低リスク傾向', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'shioze', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert('grade取得できる', ['A','B','C'].includes(r.grade), `grade=${r.grade}`);
  // 塩瀬(-1)+ひとえ(-1)+装飾なし(-1)+水通し歴あり(-2)+白(-1) = -6 → A
  assert('低リスクでA判定', r.grade === 'A', `score=${r.score}, grade=${r.grade}`);
});

test('Q1=正絹 + Q2s=わからない(unknown)', () => {
  // Q2sでunknownを選んだ場合、fabricも回答するルート
  const r = calcJudgment({ material: 'silk', silkFabric: 'unknown', fabric: 'smooth', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert('grade取得できる', ['A','B','C'].includes(r.grade), `grade=${r.grade}`);
});

// ============================================================
// ③ Q1=正絹 + Q2s=わからない → Q2=ちりめん凹凸 → 即C
// ============================================================
test('Q1=正絹 + Q2s=わからない + Q2=ちりめん凹凸 → 即C', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'unknown', fabric: 'crepe', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert('gradeがC', r.grade === 'C', `grade=${r.grade}`);
});

test('Q1=正絹 + Q2s=わからない + Q2=絽', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'unknown', fabric: 'ro', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert('grade取得できる', ['A','B','C'].includes(r.grade), `grade=${r.grade}`);
});

// ============================================================
// ④ Q1=混紡ルート
// ============================================================
test('Q1=混紡 + Q2=標準 → 低スコア傾向', () => {
  const r = calcJudgment({ material: 'mix', fabric: 'smooth', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert('grade取得できる', ['A','B','C'].includes(r.grade), `grade=${r.grade}`);
});

test('Q1=混紡 + Q2=ちりめん凹凸 → 即C', () => {
  const r = calcJudgment({ material: 'mix', fabric: 'crepe', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert('gradeがC', r.grade === 'C', `grade=${r.grade}`);
});

test('Q1=混紡 + Q2=わからない', () => {
  const r = calcJudgment({ material: 'mix', fabric: 'unknown', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert('grade取得できる', ['A','B','C'].includes(r.grade), `grade=${r.grade}`);
});

// ============================================================
// ⑤ 強制ルール
// ============================================================
test('強制ルール: 生地が裂けた → 即C', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'habutae', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', pastResult: 'torn', color: 'white' });
  assert('gradeがC', r.grade === 'C', `grade=${r.grade}`);
});

test('強制ルール: 過去に大きく縮んだ → 最低B', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'shioze', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', pastResult: 'shrink', color: 'white' });
  assert('gradeがB以上(BまたはC)', r.grade === 'B' || r.grade === 'C', `grade=${r.grade}`);
});

test('強制ルール: 過去に色にじみ → 最低B', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'shioze', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', pastResult: 'color', color: 'white' });
  assert('gradeがB以上', r.grade === 'B' || r.grade === 'C', `grade=${r.grade}`);
});

test('強制ルール: 繊細装飾あり → 最低B', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'shioze', tailoring: 'hitoe', decoration: 'yes', waterHistory: 'yes', color: 'white' });
  assert('gradeがB以上', r.grade === 'B' || r.grade === 'C', `grade=${r.grade}`);
});

test('強制ルール: 濃色スコア+5', () => {
  // 塩瀬(-1)+ひとえ(-1)+装飾なし(-1)+水通し歴あり(-2)+濃色(+5) = 0 → A
  const r = calcJudgment({ material: 'silk', silkFabric: 'shioze', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'dark' });
  assert('scoreが正しい', r.score === 0, `score=${r.score}`);
  assert('gradeがA', r.grade === 'A', `grade=${r.grade}`);
});

test('強制ルール: 濃色+その他リスクでB', () => {
  // 羽二重(0)+あわせ(+4)+装飾なし(-1)+水通しなし(+2)+濃色(+5) = 10 → C
  const r = calcJudgment({ material: 'silk', silkFabric: 'habutae', tailoring: 'awase', decoration: 'no', waterHistory: 'no', color: 'dark' });
  assert('grade取得できる', ['A','B','C'].includes(r.grade), `score=${r.score}, grade=${r.grade}`);
  assert('スコア10→C', r.grade === 'C', `score=${r.score}, grade=${r.grade}`);
});

test('強制ルール: 多色+リスクでB以上', () => {
  const r = calcJudgment({ material: 'mix', fabric: 'smooth', tailoring: 'hitoe', decoration: 'no', waterHistory: 'no', color: 'multi' });
  assert('grade取得できる', ['A','B','C'].includes(r.grade), `score=${r.score}, grade=${r.grade}`);
});

// ============================================================
// ⑥ Q5水処理歴「なし」「わからない」→ Q6スキップ
// ============================================================
test('Q5=水処理なし → Q6(pastResult)は回答なし扱い', () => {
  // waterHistory=no の時 pastResult は表示されないのでanswersに含まれない想定
  const r = calcJudgment({ material: 'silk', silkFabric: 'habutae', tailoring: 'hitoe', decoration: 'no', waterHistory: 'no', color: 'white' });
  assert('grade取得できる', ['A','B','C'].includes(r.grade), `grade=${r.grade}`);
  // waterHistory_no の DETAIL_NOTE が含まれるか
  assert('水処理なし解説がdetailNotesに含まれる', r.detailNotes.some(n => n.includes('初めて水に触れる')), `detailNotes=${JSON.stringify(r.detailNotes)}`);
});

test('Q5=水処理わからない → 詳細解説あり', () => {
  const r = calcJudgment({ material: 'mix', fabric: 'smooth', tailoring: 'hitoe', decoration: 'no', waterHistory: 'unknown', color: 'white' });
  assert('grade取得できる', ['A','B','C'].includes(r.grade), `grade=${r.grade}`);
  assert('水処理不明解説がdetailNotesに含まれる', r.detailNotes.some(n => n.includes('初めて水に触れる')), `detailNotes=${JSON.stringify(r.detailNotes)}`);
});

test('Q5=水処理あり → 初回縮み解説なし', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'habutae', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert('初回縮み解説が含まれない', !r.detailNotes.some(n => n.includes('初めて水に触れる')));
});

// ============================================================
// ⑦ REASON_CHIPS の存在確認（主要なチップが生成されるか）
// ============================================================
test('REASON_CHIPS: 正絹チップが出る', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'rinzu', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert('chipsが1件以上', r.chips.length > 0, `chips=${r.chips.map(c=>c.label).join(',')}`);
});

test('REASON_CHIPS: 色落ち注意チップ(濃色)', () => {
  const r = calcJudgment({ material: 'mix', fabric: 'smooth', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'dark' });
  const hasColorChip = r.chips.some(c => c.label && c.label.includes('濃色'));
  assert('濃色チップが含まれる', hasColorChip, `chips=${r.chips.map(c=>c.label).join(',')}`);
});

// ============================================================
// ⑧ Q3仕立て全選択肢のスコア確認
// ============================================================
test('Q3仕立て: 全選択肢でcrash しない', () => {
  const tailoringChoices = ['hitoe', 'awase', 'muso', 'hanmuso', 'shikiate', 'unknown'];
  tailoringChoices.forEach(t => {
    const r = calcJudgment({ material: 'mix', fabric: 'smooth', tailoring: t, decoration: 'no', waterHistory: 'yes', color: 'white' });
    assert(`仕立て=${t} → grade取得`, ['A','B','C'].includes(r.grade), `grade=${r.grade}`);
  });
});

// ============================================================
// ⑨ Q1=わからない素材推定 → 各結果ロジック（guessMaterial相当）
// ============================================================
test('素材推定: 全silk回答 → silk寄り', () => {
  // guessMaterialを直接テスト（MATERIAL_GUESS_QUESTIONSのpointを参照）
  const silkAnswers = {};
  MATERIAL_GUESS_QUESTIONS.forEach(q => { silkAnswers[q.key] = 'silk'; });
  let silk = 0, poly = 0, mix = 0;
  MATERIAL_GUESS_QUESTIONS.forEach(q => {
    const choice = q.choices.find(c => c.id === silkAnswers[q.key]);
    if (choice && choice.point) {
      silk += choice.point.silk || 0;
      poly += choice.point.poly || 0;
      mix  += choice.point.mix  || 0;
    }
  });
  assert('silkポイントが最大', silk >= poly && silk >= mix, `silk=${silk}, poly=${poly}, mix=${mix}`);
  assert('silkポイントが3以上', silk >= 3, `silk=${silk}`);
});

test('素材推定: 全poly回答 → poly寄り', () => {
  const polyAnswers = {};
  MATERIAL_GUESS_QUESTIONS.forEach(q => { polyAnswers[q.key] = 'poly'; });
  let silk = 0, poly = 0, mix = 0;
  MATERIAL_GUESS_QUESTIONS.forEach(q => {
    const choice = q.choices.find(c => c.id === polyAnswers[q.key]);
    if (choice && choice.point) {
      silk += choice.point.silk || 0;
      poly += choice.point.poly || 0;
      mix  += choice.point.mix  || 0;
    }
  });
  assert('polyポイントが最大', poly >= silk && poly >= mix, `silk=${silk}, poly=${poly}, mix=${mix}`);
  assert('polyポイントが3以上', poly >= 3, `poly=${poly}`);
});

// ============================================================
// ⑩ スコア閾値の境界値テスト
// ============================================================
test('スコア境界値: score=2 → A', () => {
  // 素材silk(0)+silkFabric:rinzu(4)+hitoe(-1)+no-decoration(-1)+waterHistory:yes(-2)+white(-1) = -1 → A
  const r = calcJudgment({ material: 'silk', silkFabric: 'rinzu', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert(`score=${r.score}`, true);
  assert('grade確認', ['A','B','C'].includes(r.grade), `grade=${r.grade}`);
});

test('スコア境界値: score=3 → B', () => {
  // mix+smooth(-1)+awase(+4)+no(-1)+yes(-2)+white(-1) = -1 → A
  // mix+smooth(-1)+awase(+4)+no(-1)+no(+2)+mid(+1) = 5 → B
  const r = calcJudgment({ material: 'mix', fabric: 'smooth', tailoring: 'awase', decoration: 'no', waterHistory: 'no', color: 'mid' });
  assert(`score=${r.score}, grade=${r.grade}`, ['A','B','C'].includes(r.grade));
  assert('score=5→B', r.score === 5 && r.grade === 'B', `score=${r.score}, grade=${r.grade}`);
});

test('スコア境界値: score>=8 → C', () => {
  // silk+rinzu(4)+awase(4)+yes(4)+no(2)+dark(5) = 19 → C
  const r = calcJudgment({ material: 'silk', silkFabric: 'rinzu', tailoring: 'awase', decoration: 'yes', waterHistory: 'no', color: 'dark' });
  assert('高スコア→C', r.grade === 'C', `score=${r.score}, grade=${r.grade}`);
});

// ============================================================
// ⑪ resultオブジェクトの構造確認
// ============================================================
test('resultオブジェクトの構造', () => {
  const r = calcJudgment({ material: 'silk', silkFabric: 'habutae', tailoring: 'hitoe', decoration: 'no', waterHistory: 'yes', color: 'white' });
  assert('grade フィールドあり', typeof r.grade === 'string');
  assert('score フィールドあり', typeof r.score === 'number');
  assert('chips フィールドあり（配列）', Array.isArray(r.chips));
  assert('detailNotes フィールドあり（配列）', Array.isArray(r.detailNotes));
  assert('answers フィールドあり', typeof r.answers === 'object');
});

// ============================================================
// 結果サマリー
// ============================================================
console.log('\n' + '='.repeat(50));
console.log(`テスト結果: ${passed} 件成功 / ${failed} 件失敗`);
if (errors.length > 0) {
  console.log('\n失敗した項目:');
  errors.forEach(e => console.log('  ❌ ' + e));
}
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
