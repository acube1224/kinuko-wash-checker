/* ===========================
   長襦袢セルフ判定 - 質問データ
   =========================== */

const QUESTIONS = [
  {
    id: 1,
    label: 'Q1 ／ 素材',
    text: 'この長襦袢の素材に、\nいちばん近いものを選んでください',
    hint: '購入時の説明、タグ、反物の情報があれば参考にしてください。\nはっきりしない場合は「わからない」で大丈夫です。',
    choices: [
      { id: 'silk',    icon: '🌿', label: '正絹',           score: 2 },
      { id: 'mix',     icon: '🌾', label: '混紡・綿・麻・ウール', score: 0 },
      { id: 'other',   icon: '🪡', label: '化繊（ポリ・シルック）', score: -2 },
      { id: 'unknown', icon: '❓', label: 'わからない',      score: 2 }
    ],
    key: 'material'
  },
  // Q2s: 正絹専用の生地種類（Q1で正絹を選んだ場合のみ表示）
  {
    id: '2s',
    label: 'Q2 ／ 正絹の生地種類',
    text: '正絹の生地種類に、\nいちばん近いものを選んでください',
    hint: '生地種類によって洗いやすさが大きく異なります。タグや購入時の情報を参考にしてください。わからない場合は「その他・わからない」を選んでください。',
    choices: [
      { id: 'rinzu',     icon: '',   label: '綸子',                     score: 2  },
      { id: 'seika',     icon: '',   label: '精華パレス',               score: 0  },
      { id: 'shioze',    icon: '',   label: '塩瀬の半衿・うそつき',     score: -1 },
      { id: 'ro',        icon: '',   label: '絽・紗',                   score: 3  },
      { id: 'habutae',   icon: '',   label: '羽二重',                   score: 5  },
      { id: 'chirimen',  icon: '',   label: 'ちりめん',                 score: 10 },
      { id: 'unknown',   icon: '❓', label: 'その他・わからない',       score: 2  }
    ],
    key: 'silkFabric'
  },
  // Q1x: 素材推定（Q1で「わからない」を選んだ場合のみ表示・4問）
  {
    id: 'mg',
    label: '素材を調べる',
    text: '素材を調べるための質問をします',
    hint: '',
    choices: [],
    key: 'materialGuess'
  },
  {
    id: 2,
    label: 'Q2 ／ 生地',
    text: '生地の特徴に、\nいちばん近いものを選んでください',
    hint: '表面を見たり、手でやさしく触れたりして選んでください。\nちりめんのような強い凹凸は注意が必要です。絽のようなとても薄い生地も慎重に扱う必要があります。',
    choices: [
      { id: 'smooth',   icon: '✨', label: '標準的な生地感',                       score: -1 },
      { id: 'crepe',    icon: '⚠️', label: 'ちりめんのように、細かい凹凸が強い',  score: 5 },
      { id: 'ro',       icon: '🎐', label: '絽（ろ）のように、かなり薄く透け感がある', score: 3 }
    ],
    key: 'fabric'
  },
  {
    id: 3,
    label: 'Q3 ／ 仕立て',
    text: '仕立ての種類に、\nいちばん近いものを選んでください',
    hint: 'ひとえはシンプルで洗いやすい構造です。袷・無双・居敷当付きなどは、部分ごとの縮み方の違いによって縫い目にヨレやつれが出ることがあります。',
    choices: [
      { id: 'hitoe',    icon: '👘', label: 'ひとえ（単）',          score: -1 },
      { id: 'awase',    icon: '🔀', label: 'あわせ（袷）',           score: 4 },
      { id: 'muso',     icon: '🧵', label: '袖無双の胴抜き',         score: 3 },
      { id: 'hanmuso',  icon: '🪡', label: '半無双',                 score: 2 },
      { id: 'shikiate', icon: '🧷', label: '居敷当付き',             score: 3 }
    ],
    key: 'tailoring'
  },
  {
    id: 4,
    label: 'Q4 ／ 装飾',
    text: '金彩・箔・ラメ・刺繍など、\n繊細な加工はありますか',
    hint: 'きらっと見える加工や、盛り上がった装飾、刺繍のあるものは、洗うことで風合いや見た目が変わる場合があります。',
    choices: [
      { id: 'yes',     icon: '✨', label: 'ある',        score: 4 },
      { id: 'no',      icon: '👍', label: 'ない',        score: -1 }
    ],
    key: 'decoration'
  },
  {
    id: 5,
    label: 'Q5 ／ 水処理歴',
    text: '過去に、この長襦袢へ\n水を通したことがありますか',
    hint: '水通し・丸洗い・洗い張りの経験があるものは、縮み方の傾向が少し読みやすいことがあります。ただし、それだけで安全とは限りません。',
    choices: [
      { id: 'yes',     icon: '💧', label: '水通し・洗い張りをしたことがある',         score: -3 },
      { id: 'no',      icon: '🚫', label: 'したことはない',                            score: 2 },
      { id: 'unknown', icon: '❓', label: 'わからない',                                score: 1 }
    ],
    key: 'waterHistory'
  },
  {
    id: 6,
    label: 'Q6 ／ 過去の変化',
    text: '過去に専門店に丸洗いに出した経験、\nまたはご自身でセルフ洗濯した経験がある場合、\nその後に気になる変化はありましたか',
    hint: '以前の実績は、とても大切な判断材料です。少しでも不安な変化があった場合は、今回も慎重に考えるのがおすすめです。',
    choices: [
      { id: 'ok',          icon: '✅', label: '特に変化なし',                       score: -2 },
      { id: 'smallshrink', icon: '🙆', label: '数ミリ程度の縮みはあったが気にならない', score: 0 },
      { id: 'shrink',      icon: '😟', label: '大きく縮んだ',                       score: 5 },
      { id: 'torn',        icon: '🚨', label: '生地が裂けた',                       score: 10 },
      { id: 'color',       icon: '😟', label: '色にじみした',                       score: 5 }
    ],
    key: 'pastResult'
  },
  {
    id: 7,
    label: 'Q7 ／ 地色',
    text: '地色に、\nいちばん近いものを選んでください',
    hint: '赤・濃茶・黒・紺などの濃い色は、色落ちや色移りのリスクを高めに見たほうが無難です。また、多色・ぼかしも、にじみや色泣きに注意が必要です。',
    choices: [
      { id: 'white',   icon: '⬜', label: '白・生成り・ごく淡い色',       score: -1 },
      { id: 'light',   icon: '🌸', label: '淡色',                         score: 0 },
      { id: 'mid',     icon: '🎨', label: '中間色',                       score: 1 },
      { id: 'dark',    icon: '🟥', label: '濃色（赤・濃茶・黒・紺など）', score: 5 },
      { id: 'multi',   icon: '🌈', label: '多色・ぼかし',                 score: 2 }
    ],
    key: 'color'
  }
];


/* =================================
   素材推定質問（Q1で「わからない」を選んだ場合のみ表示）
   4問の回答から正絹／化繊／混紡を推定する
   ================================= */
const MATERIAL_GUESS_QUESTIONS = [
  {
    id: 'mg1',
    label: '素材を調べる ① ／ 光沢',
    text: '生地の光沢はどのように見えますか？',
    hint: '自然光や室内灯の下で生地を動かしながら確認してください。',
    choices: [
      { id: 'silk',  icon: '✨', label: '上品で深い光沢・角度で色が変わるぬめり感',  point: { silk: 1 } },
      { id: 'poly',  icon: '💡', label: '均一でテカっとした光沢（やや安っぽい）',    point: { poly: 1 } },
      { id: 'mat',   icon: '🪨', label: '光沢がほぼない・マットな印象',              point: { mix: 1 }  }
    ],
    key: 'mg_gloss'
  },
  {
    id: 'mg2',
    label: '素材を調べる ② ／ 手触り',
    text: '生地を触ったときの感触はどれに近いですか？',
    hint: '手のひらでやさしく触れて確認してください。',
    choices: [
      { id: 'silk',  icon: '🌿', label: 'ひんやり・しっとりした感触',                point: { silk: 1 } },
      { id: 'poly',  icon: '🪡', label: 'ツルツル or カサカサ（人工的な感触）',      point: { poly: 1 } },
      { id: 'wool',  icon: '🧶', label: 'ふんわり暖かい・やや毛羽立ちがある',        point: { mix: 1 }  },
      { id: 'cotton',icon: '🌾', label: 'サラッと乾いた感じ',                        point: { mix: 1 }  }
    ],
    key: 'mg_touch'
  },
  {
    id: 'mg3',
    label: '素材を調べる ③ ／ シワの戻り方',
    text: '生地を軽く握って離すと、シワはどうなりますか？',
    hint: '目立たない部分を5秒ほど軽く握ってから離して確認してください。',
    choices: [
      { id: 'silk',  icon: '🌀', label: '細かいシワができてすぐ戻る',                point: { silk: 1 } },
      { id: 'poly',  icon: '📄', label: 'ほぼシワにならない',                        point: { poly: 1 } },
      { id: 'cotton',icon: '📝', label: 'くっきりシワが残る',                        point: { mix: 1 }  },
      { id: 'wool',  icon: '🔄', label: 'ゆるく戻る（完全には戻らない）',            point: { mix: 1 }  }
    ],
    key: 'mg_wrinkle'
  },
  {
    id: 'mg4',
    label: '素材を調べる ④ ／ 音',
    text: '生地同士を軽く擦り合わせると、どんな音がしますか？',
    hint: '生地を両手で持ち、やさしく擦り合わせて確認してください。',
    choices: [
      { id: 'silk',  icon: '🎵', label: 'キュッキュッという音（絹鳴り）',            point: { silk: 1 } },
      { id: 'poly',  icon: '📢', label: 'シャカシャカという音',                      point: { poly: 1 } },
      { id: 'cotton',icon: '🔇', label: 'ほぼ音がしない',                            point: { mix: 1 }  },
      { id: 'wool',  icon: '🧸', label: 'モフっとした感じで音がしない',              point: { mix: 1 }  }
    ],
    key: 'mg_sound'
  }
];

/* =================================
   判定に使う「理由チップ」マッピング
   ================================= */
const REASON_CHIPS = {
  // 素材
  material_silk:    { label: '正絹',           type: 'neutral' },
  material_mix:     { label: '混紡・綿・麻・ウール', type: 'caution' },
  material_other:   { label: '化繊（ポリ・シルック）', type: 'safe' },
  material_unknown: { label: '素材が不明',     type: 'caution' },

  // 生地（正絹以外用）
  fabric_smooth:   { label: '表面が滑らかな普通の生地', type: 'safe' },
  fabric_crepe:    { label: 'ちりめん・強いシボ',    type: 'danger' },
  fabric_ro:       { label: '絽などの極薄物',        type: 'caution' },
  fabric_unknown:  { label: '生地特徴が不明',        type: 'caution' },

  // 正絹生地種類
  silkFabric_chirimen: { label: '縮緬（洗い不可）',           type: 'danger'  },
  silkFabric_rinzu:    { label: '綸子（縮み・光沢リスク）',   type: 'caution' },
  silkFabric_seika:    { label: '精華（型崩れ注意）',         type: 'caution' },
  silkFabric_habutae:  { label: '羽二重（硬化リスク軽微）',   type: 'caution' },
  silkFabric_palace:   { label: 'パレス（薄手・要注意）',     type: 'caution' },
  silkFabric_komakoma: { label: '駒駒（収縮しにくい）',       type: 'safe'    },
  silkFabric_shioze:   { label: '塩瀬（安定・厚手）',         type: 'safe'    },
  silkFabric_ro:       { label: '絽・紗（型崩れ注意）',       type: 'caution' },
  silkFabric_unknown:  { label: '生地種類が不明',             type: 'caution' },

  // 仕立て
  tailoring_hitoe:    { label: 'ひとえ（単）',              type: 'safe'    },
  tailoring_awase:    { label: 'あわせ（袷）（ヨレ注意）',  type: 'caution' },
  tailoring_muso:     { label: '袖無双の胴抜き（袖口注意）', type: 'caution' },
  tailoring_hanmuso:  { label: '半無双（縮み差注意）',       type: 'caution' },
  tailoring_shikiate: { label: '居敷当付き（縮み差注意）',   type: 'caution' },
  tailoring_unknown:  { label: '仕立てが不明',               type: 'caution' },

  // 装飾
  decoration_yes:     { label: '繊細な加工あり',   type: 'danger' },
  decoration_no:      { label: '特殊加工なし',     type: 'safe' },
  decoration_unknown: { label: '装飾が不明',       type: 'caution' },

  // 水処理歴
  waterHistory_yes:     { label: '水通し・洗浄歴あり', type: 'safe' },
  waterHistory_no:      { label: '水処理歴なし',       type: 'caution' },
  waterHistory_unknown: { label: '水処理歴が不明',     type: 'caution' },

  // 過去の変化
  pastResult_ok:          { label: '過去の洗いで変化なし',         type: 'safe' },
  pastResult_smallshrink: { label: '数ミリ縮みあり（許容範囲内）',  type: 'neutral' },
  pastResult_shrink:      { label: '過去に大きく縮んだ',            type: 'danger' },
  pastResult_torn:        { label: '過去に生地が裂けた',            type: 'danger' },
  pastResult_color:       { label: '過去に色にじみあり',            type: 'danger' },
  pastResult_unknown:     { label: '過去の状態が不明',              type: 'caution' },

  // 地色
  color_white:   { label: '白・淡色で色落ちリスク低',   type: 'safe' },
  color_light:   { label: '淡色',                        type: 'safe' },
  color_mid:     { label: '中間色',                      type: 'neutral' },
  color_dark:    { label: '濃色（色落ち注意）',          type: 'danger' },
  color_multi:   { label: '多色・ぼかし（にじみ注意）', type: 'caution' },
  color_unknown: { label: '地色が不明',                  type: 'caution' },

  // オプション
  option_guard:   { label: 'ガード加工（パールトーン）あり', type: 'safe' },
  option_vintage: { label: 'ビンテージ品（経年劣化注意）',   type: 'danger' }
};


/* =====================================
   詳細理由テキスト（詳細画面用）
   ===================================== */
const DETAIL_NOTES = {
  // 生地（正絹以外用）
  fabric_crepe:   'ちりめんは強いシボにより水に濡れると縮みが出やすく、自宅洗いには向きません。',
  fabric_ro:      '絽は非常に薄い生地のため、洗浄中の張りの変化やヨレが出やすい場合があります。慎重な扱いが必要です。',
  fabric_smooth:  '比較的なめらかな正絹地は、適切な手洗いであれば対応しやすいタイプです。',

  // 正絹生地種類
  silkFabric_chirimen: '縮緬は水に浸けた瞬間にシボが凝縮し、みるみる縮みます。アイロンで伸ばしきるのは至難の業です。',
  silkFabric_rinzu:    '綸子は初めて水に触れる場合2〜3%程度の縮みが出る可能性があります。また、光沢が曇る場合があるため、気になる方は、ご家庭にある髪用コンディショナーを併用して対策してください。',
  silkFabric_seika:    '精華は短時間なら大きな縮みはないですが、全体的に型崩れしやすく、干す時によく引っ張り形を整える必要があります。',
  silkFabric_habutae:  '羽二重は初めて水に触れる場合2〜3%程度の縮みが出る可能性があります。また乾燥後に生地が少し硬くなる、光沢感が若干曇る場合があるため、気になる方は、ご家庭にある髪用コンディショナーを併用して対策してください。',
  silkFabric_palace:   'パレスは非常に薄いため、短時間で手早く行う必要があります。',
  silkFabric_komakoma: '駒駒は元々コシがあるため、手早く済ませれば収縮は最小限に抑えやすい生地です。',
  silkFabric_shioze:   '塩瀬は厚手なので短時間なら安定していますが、半衿などは形を整えて干す必要があります。',
  silkFabric_ro:       '絽・紗は隙間があるため水抜けは良いですが、目が荒いので型崩れには注意が必要です。',

  // 仕立て
  tailoring_hitoe:    'ひとえ単はシンプルな仕立てのため、仕立て構造上のリスクは比較的少なめです。',
  tailoring_awase:    'あわせ仕立ては表地と裏地の収縮率の違いにより、縫い目にヨレが出ることがあります。',
  tailoring_muso:     '袖無双の胴抜きは袖部分が二重構造のため、袖口周辺に縮み差によるヨレが出ることがあります。',
  tailoring_hanmuso:  '半無双は袖の一部が二重構造です。部分的な縮み差に注意して洗いましょう。',
  tailoring_shikiate: '居敷当付きは後ろ身頃に当て布があり、当て布との縮み差で波打ちが生じる場合があります。',

  // 装飾
  decoration_yes: '金彩・箔・刺繍などの繊細な加工は、水に触れることで剥落や変形、ほつれが起きる場合があります。',

  // 色
  color_dark:  '深く染めた濃色（赤・濃茶・黒・紺）は、繊維から色素が溶け出しやすいため、色落ちや色移りに注意が必要です。',
  color_multi: '多色・ぼかし染めは複数の染料が使われているため、色泣きやにじみのリスクがあります。',

  // 水処理歴
  waterHistory_no:      '初めて水に触れるため、縮み度合いは2回目以降に比べて大きめになる可能性があります。',
  waterHistory_unknown: '初めて水に触れるため、縮み度合いは2回目以降に比べて大きめになる可能性があります。',

  // 過去の変化
  pastResult_shrink:      '過去に大きく縮んだ実績は、再び同じ問題が起きるリスクが高いことを示します。',
  pastResult_torn:        '生地が裂けるほど劣化している場合、自宅洗いによるさらなるダメージのリスクが非常に高いです。',
  pastResult_color:       '過去に色にじみがあった場合、自宅洗いは非推奨です。',
  pastResult_smallshrink: '数ミリ程度の縮みは許容範囲内と判断されましたが、今後も同様の変化が起きる可能性があります。',
};
