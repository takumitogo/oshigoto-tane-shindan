/* =========================================================================
   お仕事たね診断 - script.js
   構成:
   1. カテゴリー定義 / スケール定義
   2. 質問データ（セクション1〜7）
   3. 事業別・カテゴリー別 業務データ
   4. 文章生成用の言い回し辞書
   5. アプリの状態管理・画面遷移
   6. 質問レンダリング
   7. スコアリング & 結果生成
   8. 結果表示・保存/印刷/コピー
   ========================================================================= */

/* -------------------------------------------------------------------------
   1. カテゴリー & 回答スケール定義
   ------------------------------------------------------------------------- */

// 12の特性カテゴリー（この配列の順序が結果画面の基準順にもなる）
const CATEGORIES = [
  "探索・情報発見", "比較・評価", "対話・ヒアリング", "共感・サポート",
  "体験・行動", "発信・表現", "企画・アイデア", "デザイン・感覚",
  "整理・分類", "正確性・チェック", "反復・処理", "達成・数値目標"
];

// 5段階スケールの定義（ラベルと加点/減点）
// value: 加点数。ネガティブ寄りのラベルには negative:true を付けてボタンの色を変える
const SCALES = {
  // 「好き/苦手」系（興味・自然にできること・人との関わり方 好き軸）
  liking: [
    { label: "とても好き", value: 4 },
    { label: "わりと好き", value: 3 },
    { label: "どちらでもない", value: 0 },
    { label: "やや苦手", value: -2, negative: true },
    { label: "とても苦手", value: -4, negative: true },
  ],
  // 「当てはまる」系（自然にできること用）
  fitting: [
    { label: "とても当てはまる", value: 4 },
    { label: "やや当てはまる", value: 3 },
    { label: "どちらでもない", value: 0 },
    { label: "あまり当てはまらない", value: -2, negative: true },
    { label: "まったく当てはまらない", value: -4, negative: true },
  ],
  // 「嬉しい」系（やりがい・報酬用）
  glad: [
    { label: "とても嬉しい", value: 4 },
    { label: "わりと嬉しい", value: 3 },
    { label: "どちらでもない", value: 0 },
    { label: "あまり嬉しくない", value: -2, negative: true },
    { label: "嬉しくない", value: -4, negative: true },
  ],
  // 負担度（ストレス要因用）。高いほど負担が大きい
  burden: [
    { label: "とても当てはまる", value: 4 },
    { label: "やや当てはまる", value: 2 },
    { label: "どちらでもない", value: 0 },
    { label: "あまり当てはまらない", value: -2 },
    { label: "まったく当てはまらない", value: -4 },
  ],
};

/* -------------------------------------------------------------------------
   2. 質問データ
   ------------------------------------------------------------------------- */

// ---- セクション1: 興味・好奇心（5段階 / liking） ----
const Q_INTEREST = [
  ["ネットで新しい情報を探す", "探索・情報発見"],
  ["気になることを詳しく調べる", "探索・情報発見"],
  ["複数の商品やサービスを比較する", "比較・評価"],
  ["他の人が知らない情報を見つける", "探索・情報発見"],
  ["人の話を聞く", "対話・ヒアリング"],
  ["自分の体験を人に話す", "発信・表現"],
  ["誰かにおすすめを紹介する", "発信・表現"],
  ["困っている人を助ける", "共感・サポート"],
  ["文章を書く", "発信・表現"],
  ["短い感想を書く", "発信・表現"],
  ["写真を撮る", "デザイン・感覚"],
  ["動画を撮る", "デザイン・感覚"],
  ["SNSに投稿する", "発信・表現"],
  ["デザインや見た目を考える", "デザイン・感覚"],
  ["新しい企画を考える", "企画・アイデア"],
  ["面白い名前や言葉を考える", "企画・アイデア"],
  ["情報を分類する", "整理・分類"],
  ["リストを作る", "整理・分類"],
  ["決められた情報を入力する", "反復・処理"],
  ["間違いを見つける", "正確性・チェック"],
  ["数字や件数を管理する", "達成・数値目標"],
  ["同じ作業を繰り返す", "反復・処理"],
  ["新しい場所へ行く", "体験・行動"],
  ["商品やサービスを実際に試す", "体験・行動"],
].map(([text, cat], i) => ({ id: `int_${i}`, text, cats: [cat], scale: "liking" }));

// ---- セクション2: 自然にできること（5段階 / fitting） ----
const Q_TRAIT = [
  ["相手の気持ちを想像できる", "共感・サポート"],
  ["人の話を聞ける", "対話・ヒアリング"],
  ["人を励ますことができる", "共感・サポート"],
  ["新しいアイデアを出せる", "企画・アイデア"],
  ["良いものや面白いものを見つけられる", "探索・情報発見"],
  ["違いや変化に気づける", "正確性・チェック"],
  ["細かい間違いに気づける", "正確性・チェック"],
  ["見た目の良し悪しを判断できる", "デザイン・感覚"],
  ["自分の体験を率直に伝えられる", "発信・表現"],
  ["知らないことを質問できる", "対話・ヒアリング"],
  ["人に分かりやすく説明できる", "発信・表現"],
  ["情報を調べられる", "探索・情報発見"],
  ["情報を整理できる", "整理・分類"],
  ["短時間で一気に集中できる", "達成・数値目標"],
  ["決められた目標を達成できる", "達成・数値目標"],
].map(([text, cat], i) => ({ id: `tra_${i}`, text, cats: [cat], scale: "fitting" }));

// ---- セクション3: 苦手・ストレス要因（負担度 / burden） ----
const Q_STRESS = [
  ["何をすればよいか曖昧", "曖昧"],
  ["作業量が多い", "大量作業"],
  ["終わりが見えない", "終わりなし"],
  ["説明が長い", "長い説明"],
  ["やり方を自分で考える必要がある", "自己判断"],
  ["間違える可能性がある", "ミス懸念"],
  ["正解が分からない", "不明確"],
  ["納期が遠い", "納期遠"],
  ["納期が近い", "納期近"],
  ["人から細かく指示される", "細指示"],
  ["興味を持てない", "無関心"],
  ["何の役に立つか分からない", "無意味感"],
  ["同じ作業が続く", "反復疲れ"],
  ["判断する回数が多い", "判断過多"],
  ["成果がすぐに見えない", "成果不可視"],
  ["一度失敗するとやる気が落ちる", "失敗敏感"],
  ["一度休むと再開しにくい", "再開困難"],
  ["完璧にしようとして進まない", "完璧主義"],
].map(([text, tag], i) => ({ id: `str_${i}`, text, tag, scale: "burden" }));

// ---- セクション4: 集中しやすい環境（複数選択 + 単一選択） ----
const ENV_OPTIONS = [
  "興味のある内容", "その日のうちに終わる", "終了条件が明確", "やることが1つだけ",
  "複数の仕事を切り替えられる", "人と一緒に進める", "一人で静かに進める", "誰かが近くにいる",
  "進捗を確認してもらえる", "自分で仕事を選べる", "ゲームや競争の要素がある", "報酬が明確",
  "人から頼まれた仕事", "誰かが困っている仕事", "成果がすぐに見える", "音楽や動画を流せる",
  "外出や移動がある",
];
const DURATION_OPTIONS = [
  "5～15分", "30分程度", "1～2時間", "時間ではなく1件単位",
  "興味があれば何時間でも続けられる", "内容によって違う",
];

// ---- セクション5: やりがい・報酬（5段階 / glad） ----
const Q_REWARD = [
  ["人から感謝される", "共感・サポート"],
  ["人の役に立ったと分かる", "共感・サポート"],
  ["成果が数字で見える", "達成・数値目標"],
  ["自分の作品や成果が残る", "発信・表現"],
  ["SNSなどで反応がもらえる", "発信・表現"],
  ["自分の意見が採用される", "企画・アイデア"],
  ["自分にしかできない役割を持つ", "企画・アイデア"],
  ["新しいことを経験する", "体験・行動"],
  ["新しい知識を得る", "探索・情報発見"],
  ["お金や報酬がもらえる", "達成・数値目標"],
  ["ポイントやレベルが上がる", "達成・数値目標"],
  ["目標を達成する", "達成・数値目標"],
  ["人から褒められる", "共感・サポート"],
  ["誰かと一緒に達成する", "対話・ヒアリング"],
  ["自分のペースでできる", null],
  ["自由に工夫できる", "企画・アイデア"],
].map(([text, cat], i) => ({ id: `rew_${i}`, text, cats: cat ? [cat] : [], scale: "glad" }));

// ---- セクション6a: 人との関わり方（好き軸 / liking） ----
const Q_RELATE_LIKE = [
  ["家族や知っている人と話す", "対話・ヒアリング"],
  ["初対面の人と短時間話す", "対話・ヒアリング"],
  ["同じ人と継続的に関わる", "対話・ヒアリング"],
  ["電話で話す", "対話・ヒアリング"],
  ["対面で話す", "対話・ヒアリング"],
  ["チャットやメールで話す", "対話・ヒアリング"],
  ["SNS上で交流する", "発信・表現"],
  ["人の話を聞く", "共感・サポート"],
  ["自分から説明する", "発信・表現"],
  ["人に質問する", "対話・ヒアリング"],
  ["人へお願いする", "対話・ヒアリング"],
  ["一人で仕事を完結する", "反復・処理"],
].map(([text, cat], i) => ({ id: `rel_${i}`, text, cats: [cat], scale: "liking" }));

// ---- セクション6b: 人との関わり方（負担軸 / burden） ----
const Q_RELATE_BURDEN = [
  ["断られる", "断られる"],
  ["怒られる", "怒られる"],
  ["自分から話しかける", "自分から話しかける"],
  ["長時間会話する", "長時間会話"],
  ["敬語を使う", "敬語"],
  ["その場で判断する", "即断"],
  ["複数人と関わる", "複数人"],
  ["定期的に連絡する", "定期連絡"],
  ["相手の予定に合わせる", "予定調整"],
].map(([text, tag], i) => ({ id: `relb_${i}`, text, tag, scale: "burden" }));

// ---- セクション7: 仕事の進め方（単一選択 x4グループ） ----
const WORKSTYLE_GROUPS = [
  {
    key: "instruction", title: "指示の受け方", options: [
      "手順を細かく説明してほしい", "見本を見せてほしい", "ゴールだけ教えてほしい",
      "一緒に最初だけやってほしい", "自分でやり方を考えたい",
    ],
  },
  {
    key: "taskDelivery", title: "タスクの渡され方", options: [
      "1つずつ渡してほしい", "1日分をまとめて渡してほしい",
      "複数の中から自分で選びたい", "1週間分を自由に進めたい",
    ],
  },
  {
    key: "progressCheck", title: "進捗確認", options: [
      "終わるたびに確認してほしい", "1日1回確認してほしい",
      "数日に1回確認してほしい", "期限までは任せてほしい", "自分から報告したい",
    ],
  },
  {
    key: "decision", title: "判断方法", options: [
      "判断基準を明確にしてほしい", "迷ったらすぐ質問したい",
      "多少間違っても自分で決めたい", "一緒に相談して決めたい",
    ],
  },
];

// アウトリーチ系（電話・訪問・営業など）を含むタスク文字列の判定キーワード
const OUTREACH_KEYWORDS = ["電話", "訪問", "営業", "飛び込み", "その場"];
// 負担軸のうち「アウトリーチ業務」への抵抗感に直結しやすいタグ
const OUTREACH_SENSITIVE_TAGS = ["断られる", "自分から話しかける", "長時間会話", "即断", "複数人", "怒られる"];

/* -------------------------------------------------------------------------
   3. 事業別・カテゴリー別 業務データ
   ------------------------------------------------------------------------- */

const BUSINESSES = [
  {
    name: "iGoo",
    tasksByCategory: {
      "探索・情報発見": ["障がい者割引施設の発掘", "新しい割引情報の調査", "WebやSNS上の情報収集"],
      "比較・評価": ["掲載情報の比較", "他サービスとの比較", "掲載基準のチェック"],
      "対話・ヒアリング": ["施設への電話確認", "施設担当者へのヒアリング", "利用者インタビュー"],
      "共感・サポート": ["障がい者本人目線での情報確認", "利用者の困りごとの収集", "問い合わせ対応"],
      "体験・行動": ["施設への訪問", "サービスの体験調査", "現地情報の確認"],
      "発信・表現": ["SNS投稿", "施設紹介文の作成", "体験記事の作成"],
      "企画・アイデア": ["特集企画", "キャンペーン企画", "新機能の提案"],
      "デザイン・感覚": ["投稿画像の作成", "掲載ページの見た目確認", "アプリ画面の使いやすさ確認"],
      "整理・分類": ["施設情報のカテゴリ分け", "エリア別整理", "掲載情報の整備"],
      "正確性・チェック": ["割引条件の確認", "古い情報のチェック", "掲載内容の校正"],
      "反復・処理": ["施設情報の入力", "定型的な情報更新", "リスト作成"],
      "達成・数値目標": ["掲載施設数の進捗管理", "更新件数の管理", "SNS投稿件数の管理"],
    },
  },
  {
    name: "滋賀の個人店舗応援事業",
    tasksByCategory: {
      "探索・情報発見": ["店舗の発掘", "店舗の魅力発見"],
      "対話・ヒアリング": ["オーナーへのヒアリング"],
      "体験・行動": ["店舗訪問"],
      "デザイン・感覚": ["写真撮影"],
      "発信・表現": ["SNS投稿"],
      "企画・アイデア": ["特集企画", "イベント企画"],
      "正確性・チェック": ["アプリのユーザー目線チェック", "掲載内容チェック"],
      "反復・処理": ["店舗情報入力"],
    },
  },
  {
    name: "障がい者関連事業",
    tasksByCategory: {
      "対話・ヒアリング": ["利用者ヒアリング", "就労施設へのヒアリング", "施設との連絡"],
      "共感・サポート": ["当事者目線でのサービス確認", "困りごとの収集"],
      "正確性・チェック": ["案件内容の分かりやすさチェック"],
      "発信・表現": ["利用体験の発信"],
      "企画・アイデア": ["新しい支援企画の提案"],
    },
  },
  {
    name: "企業データベース事業",
    tasksByCategory: {
      "探索・情報発見": ["新しい情報源の発見", "サイトや媒体の調査"],
      "正確性・チェック": ["サンプルデータの品質確認", "重複や誤情報のチェック"],
      "反復・処理": ["企業情報の入力"],
      "整理・分類": ["情報の分類"],
      "企画・アイデア": ["業界別リストの企画"],
      "比較・評価": ["ユーザー目線での使いやすさ確認"],
    },
  },
  {
    name: "共通バックオフィス業務",
    tasksByCategory: {
      "対話・ヒアリング": ["メール対応"],
      "発信・表現": ["SNS対応"],
      "整理・分類": ["スケジュール確認", "書類整理"],
      "反復・処理": ["データ入力", "簡単な経理入力"],
      "正確性・チェック": ["誤字脱字チェック"],
      "達成・数値目標": ["タスク進捗確認"],
      "企画・アイデア": ["マニュアル作成", "アイデア出し"],
    },
  },
];

/* -------------------------------------------------------------------------
   4. 文章生成用の言い回し辞書
   ------------------------------------------------------------------------- */

const CATEGORY_PHRASES = {
  "探索・情報発見": "新しい情報を探したり見つけたりすること",
  "比較・評価": "いくつかの選択肢を比べて見極めること",
  "対話・ヒアリング": "人の話をじっくり聞くこと",
  "共感・サポート": "困っている人にそっと寄り添うこと",
  "体験・行動": "実際に足を運んだり体験してみること",
  "発信・表現": "感じたことを言葉や写真で人に伝えること",
  "企画・アイデア": "新しい企画やアイデアを考えること",
  "デザイン・感覚": "見た目や雰囲気を整えること",
  "整理・分類": "情報を整理してわかりやすく並べること",
  "正確性・チェック": "細かな違いや間違いに気づくこと",
  "反復・処理": "決まった作業をコツコツ積み重ねること",
  "達成・数値目標": "目標や数字を一つずつ達成していくこと",
};

const CATEGORY_ENV_DESC = {
  "探索・情報発見": "特性が強く表れている可能性があります",
  "比較・評価": "興味を持ちやすい可能性があります",
  "対話・ヒアリング": "比較的取り組みやすい可能性があります",
  "共感・サポート": "特性が強く表れている可能性があります",
  "体験・行動": "興味を持ちやすい可能性があります",
  "発信・表現": "比較的取り組みやすい可能性があります",
  "企画・アイデア": "特性が強く表れている可能性があります",
  "デザイン・感覚": "興味を持ちやすい可能性があります",
  "整理・分類": "比較的取り組みやすい可能性があります",
  "正確性・チェック": "特性が強く表れている可能性があります",
  "反復・処理": "興味を持ちやすい可能性があります",
  "達成・数値目標": "比較的取り組みやすい可能性があります",
};

const REWARD_PHRASES = {
  "人から感謝される": "人から感謝されると",
  "人の役に立ったと分かる": "誰かの役に立てたと実感できると",
  "成果が数字で見える": "成果が数字ではっきり見えると",
  "自分の作品や成果が残る": "自分の作った成果が形として残ると",
  "SNSなどで反応がもらえる": "SNSなどで反応をもらえると",
  "自分の意見が採用される": "自分の意見が採用されると",
  "自分にしかできない役割を持つ": "自分にしかできない役割を持てると",
  "新しいことを経験する": "新しいことを経験できると",
  "新しい知識を得る": "新しい知識が得られると",
  "お金や報酬がもらえる": "きちんと報酬が得られると",
  "ポイントやレベルが上がる": "ポイントやレベルが上がっていくと",
  "目標を達成する": "決めた目標を達成できると",
  "人から褒められる": "人から褒められると",
  "誰かと一緒に達成する": "誰かと一緒に目標を達成できると",
  "自分のペースでできる": "自分のペースで進められると",
  "自由に工夫できる": "自由に工夫できる余地があると",
};

const STRESS_PHRASES = {
  "何をすればよいか曖昧": "何をすればよいか曖昧な仕事",
  "作業量が多い": "作業量が多い仕事",
  "終わりが見えない": "終わりの見えない大量作業",
  "説明が長い": "説明が長い仕事",
  "やり方を自分で考える必要がある": "やり方を自分で考える必要がある仕事",
  "間違える可能性がある": "間違える可能性がある仕事",
  "正解が分からない": "正解が分からない仕事",
  "納期が遠い": "納期が遠い仕事",
  "納期が近い": "納期が近い仕事",
  "人から細かく指示される": "細かく指示される仕事",
  "興味を持てない": "興味を持てない仕事",
  "何の役に立つか分からない": "何の役に立つか分からない仕事",
  "同じ作業が続く": "同じ作業がずっと続く仕事",
  "判断する回数が多い": "判断する回数が多い仕事",
  "成果がすぐに見えない": "成果がすぐに見えない仕事",
  "一度失敗するとやる気が落ちる": "一度失敗すると引きずってしまう仕事",
  "一度休むと再開しにくい": "一度止まると再開しにくい仕事",
  "完璧にしようとして進まない": "完璧を求めすぎて進まなくなる仕事",
};

/* -------------------------------------------------------------------------
   4.5 Supabase 連携設定
   ------------------------------------------------------------------------- */

const SUPABASE_URL = "https://oidzqhsvohfxlewnfeoz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZHpxaHN2b2hmeGxld25mZW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MDY4NjEsImV4cCI6MjEwMDE4Mjg2MX0.Rcb_S8F6pdjUI1NcWFVQ8rF4IbKOEIHJCHmsqAzAQQQ";

let supabaseClient = null;
try {
  if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) { /* noop */ }

/* -------------------------------------------------------------------------
   5. セクション構成（進捗表示・画面遷移の単位）
   ------------------------------------------------------------------------- */

const SECTIONS = [
  { key: "interest", title: "興味・好奇心", sub: "好きかどうかを直感で選んでください", type: "scaleList", scale: "liking", items: Q_INTEREST },
  { key: "trait", title: "自然にできること", sub: "得意・不得意ではなく「自然にできるか」で選んでください", type: "scaleList", scale: "fitting", items: Q_TRAIT },
  { key: "stress", title: "苦手・ストレス要因", sub: "負担に感じるかどうかを教えてください", type: "scaleList", scale: "burden", items: Q_STRESS },
  { key: "env", title: "集中しやすい環境", sub: "当てはまるものをいくつでも選んでください", type: "envSection" },
  { key: "reward", title: "やりがい・報酬", sub: "その状況になったときの嬉しさを教えてください", type: "scaleList", scale: "glad", items: Q_REWARD },
  { key: "relate", title: "人との関わり方", sub: "好き・苦手と、負担に感じることの両方を教えてください", type: "relateSection" },
  { key: "workstyle", title: "仕事の進め方", sub: "希望に近いものを1つずつ選んでください", type: "workstyleSection" },
];

/* -------------------------------------------------------------------------
   6. アプリの状態管理
   ------------------------------------------------------------------------- */

const STORAGE_KEY = "oshigoto_tane_answers_v1";

const state = {
  currentStep: -1,
  answers: {},
};

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state.answers = JSON.parse(raw);
  } catch (e) { /* noop */ }
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.answers)); } catch (e) { /* noop */ }
}

/* -------------------------------------------------------------------------
   7. DOM参照 & 共通ユーティリティ
   ------------------------------------------------------------------------- */

const el = (id) => document.getElementById(id);
const screenIntro = el("screen-intro");
const screenQuestions = el("screen-questions");
const screenResult = el("screen-result");
const navbar = el("navbar");
const resultBar = el("resultBar");
const progressFill = el("progressFill");
const stepLabel = el("stepLabel");
const toastEl = el("toast");

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function setActiveScreen(name) {
  [screenIntro, screenQuestions, screenResult].forEach(s => s.removeAttribute("data-active"));
  if (name === "intro") screenIntro.setAttribute("data-active", "true");
  if (name === "questions") screenQuestions.setAttribute("data-active", "true");
  if (name === "result") screenResult.setAttribute("data-active", "true");
  window.scrollTo(0, 0);
}

/* -------------------------------------------------------------------------
   8. 画面遷移
   ------------------------------------------------------------------------- */

function goToStep(step) {
  state.currentStep = step;

  if (step === -1) {
    setActiveScreen("intro");
    navbar.setAttribute("data-visible", "false");
    resultBar.setAttribute("data-visible", "false");
    stepLabel.textContent = "はじめに";
    progressFill.style.width = "0%";
    return;
  }

  if (step >= SECTIONS.length) {
    renderResult();
    setActiveScreen("result");
    navbar.setAttribute("data-visible", "false");
    resultBar.setAttribute("data-visible", "true");
    stepLabel.textContent = "診断結果";
    progressFill.style.width = "100%";
    saveResultToSupabase();
    return;
  }

  renderSection(SECTIONS[step]);
  setActiveScreen("questions");
  navbar.setAttribute("data-visible", "true");
  resultBar.setAttribute("data-visible", "false");
  const n = step + 1;
  stepLabel.textContent = `${n}／${SECTIONS.length}　${SECTIONS[step].title}`;
  const pct = Math.round((n / SECTIONS.length) * 100);
  progressFill.style.width = pct + "%";

  el("btnPrev").style.visibility = step === 0 ? "hidden" : "visible";
  el("btnNext").textContent = step === SECTIONS.length - 1 ? "診断結果を見る →" : "次へ →";
}

el("btnStart").addEventListener("click", () => {
  const nickInput = el("nicknameInput");
  if (nickInput) state.nickname = nickInput.value.trim();
  goToStep(0);
});
el("btnPrev").addEventListener("click", () => goToStep(state.currentStep - 1));
el("btnNext").addEventListener("click", () => { goToStep(state.currentStep + 1); });

/* -------------------------------------------------------------------------
   9. 質問レンダリング
   ------------------------------------------------------------------------- */

function renderSection(section) {
  el("sectionHeading").textContent = section.title;
  el("sectionSub").textContent = section.sub;
  const list = el("questionsList");
  list.innerHTML = "";

  if (section.type === "scaleList") {
    section.items.forEach((q, idx) => list.appendChild(renderScaleQuestion(q, idx + 1, SCALES[section.scale])));
  } else if (section.type === "envSection") {
    list.appendChild(renderEnvSection());
  } else if (section.type === "relateSection") {
    const title1 = document.createElement("div");
    title1.className = "subgroup-title";
    title1.textContent = "◆ 好き・苦手を教えてください";
    list.appendChild(title1);
    Q_RELATE_LIKE.forEach((q, idx) => list.appendChild(renderScaleQuestion(q, idx + 1, SCALES.liking)));

    const title2 = document.createElement("div");
    title2.className = "subgroup-title";
    title2.textContent = "◆ 負担に感じるものを教えてください";
    list.appendChild(title2);
    Q_RELATE_BURDEN.forEach((q, idx) => list.appendChild(renderScaleQuestion(q, idx + 1, SCALES.burden)));
  } else if (section.type === "workstyleSection") {
    WORKSTYLE_GROUPS.forEach(group => list.appendChild(renderWorkstyleGroup(group)));
  }
}

function renderScaleQuestion(q, num, scaleDef) {
  const wrap = document.createElement("div");
  wrap.className = "q-block";

  const textEl = document.createElement("div");
  textEl.className = "q-text";
  textEl.innerHTML = `<span class="q-num">${num}.</span>${q.text}`;
  wrap.appendChild(textEl);

  const row = document.createElement("div");
  row.className = "opt-row scale5";

  scaleDef.forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "opt-btn";
    btn.textContent = opt.label;
    if (state.answers[q.id] && state.answers[q.id].label === opt.label) {
      btn.classList.add("selected");
      if (opt.negative) btn.classList.add("negative");
    }
    btn.addEventListener("click", () => {
      state.answers[q.id] = { label: opt.label, value: opt.value };
      persist();
      row.querySelectorAll(".opt-btn").forEach(b => b.classList.remove("selected", "negative"));
      btn.classList.add("selected");
      if (opt.negative) btn.classList.add("negative");
    });
    row.appendChild(btn);
  });

  wrap.appendChild(row);
  return wrap;
}

function renderEnvSection() {
  const frag = document.createElement("div");

  const title1 = document.createElement("div");
  title1.className = "subgroup-title";
  title1.textContent = "◆ 集中しやすい環境（いくつでも選択可）";
  frag.appendChild(title1);

  const optList = document.createElement("div");
  optList.className = "opt-list";
  const key = "env_multi";
  if (!state.answers[key]) state.answers[key] = [];

  ENV_OPTIONS.forEach(text => {
    const chip = document.createElement("div");
    chip.className = "opt-chip";
    const isSel = state.answers[key].includes(text);
    if (isSel) chip.classList.add("selected");
    chip.innerHTML = `<span class="mark">${isSel ? "✓" : ""}</span><span>${text}</span>`;
    chip.addEventListener("click", () => {
      const arr = state.answers[key];
      const i = arr.indexOf(text);
      if (i >= 0) { arr.splice(i, 1); chip.classList.remove("selected"); chip.querySelector(".mark").textContent = ""; }
      else { arr.push(text); chip.classList.add("selected"); chip.querySelector(".mark").textContent = "✓"; }
      persist();
    });
    optList.appendChild(chip);
  });
  frag.appendChild(optList);

  const title2 = document.createElement("div");
  title2.className = "subgroup-title";
  title2.textContent = "◆ 集中しやすい作業時間（1つ選択）";
  frag.appendChild(title2);

  const optList2 = document.createElement("div");
  optList2.className = "opt-list";
  const key2 = "env_duration";
  DURATION_OPTIONS.forEach(text => {
    const chip = document.createElement("div");
    chip.className = "opt-chip radio";
    if (state.answers[key2] === text) chip.classList.add("selected");
    chip.innerHTML = `<span class="mark">${state.answers[key2] === text ? "●" : ""}</span><span>${text}</span>`;
    chip.addEventListener("click", () => {
      state.answers[key2] = text;
      persist();
      optList2.querySelectorAll(".opt-chip").forEach(c => { c.classList.remove("selected"); c.querySelector(".mark").textContent = ""; });
      chip.classList.add("selected");
      chip.querySelector(".mark").textContent = "●";
    });
    optList2.appendChild(chip);
  });
  frag.appendChild(optList2);

  return frag;
}

function renderWorkstyleGroup(group) {
  const wrap = document.createElement("div");
  const title = document.createElement("div");
  title.className = "subgroup-title";
  title.textContent = "◆ " + group.title;
  wrap.appendChild(title);

  const optList = document.createElement("div");
  optList.className = "opt-list";
  const key = "ws_" + group.key;
  group.options.forEach(text => {
    const chip = document.createElement("div");
    chip.className = "opt-chip radio";
    if (state.answers[key] === text) chip.classList.add("selected");
    chip.innerHTML = `<span class="mark">${state.answers[key] === text ? "●" : ""}</span><span>${text}</span>`;
    chip.addEventListener("click", () => {
      state.answers[key] = text;
      persist();
      optList.querySelectorAll(".opt-chip").forEach(c => { c.classList.remove("selected"); c.querySelector(".mark").textContent = ""; });
      chip.classList.add("selected");
      chip.querySelector(".mark").textContent = "●";
    });
    optList.appendChild(chip);
  });
  wrap.appendChild(optList);
  return wrap;
}

/* -------------------------------------------------------------------------
   10. スコアリング
   ------------------------------------------------------------------------- */

function computeScores() {
  const catScores = {};
  CATEGORIES.forEach(c => catScores[c] = 0);

  const addCatQuestions = [Q_INTEREST, Q_TRAIT, Q_REWARD, Q_RELATE_LIKE];
  addCatQuestions.forEach(list => {
    list.forEach(q => {
      const ans = state.answers[q.id];
      if (!ans) return;
      (q.cats || []).forEach(cat => { if (cat) catScores[cat] += ans.value; });
    });
  });

  // 苦手・ストレス要因のスコア（burden: 大きいほど負担大）
  const stressResults = Q_STRESS.map(q => {
    const ans = state.answers[q.id];
    return { text: q.text, tag: q.tag, burden: ans ? ans.value : 0 };
  }).sort((a, b) => b.burden - a.burden);

  // 人との関わり方・負担軸
  const relateBurdenResults = Q_RELATE_BURDEN.map(q => {
    const ans = state.answers[q.id];
    return { text: q.text, tag: q.tag, burden: ans ? ans.value : 0 };
  }).sort((a, b) => b.burden - a.burden);

  // 負担が高い（値2以上）タグをまとめて「敏感タグ」とする
  const sensitiveTags = new Set();
  [...stressResults, ...relateBurdenResults].forEach(r => { if (r.burden >= 2) sensitiveTags.add(r.tag); });

  // アウトリーチ業務に抵抗があるか（電話・訪問営業系）
  const outreachSensitive = OUTREACH_SENSITIVE_TAGS.some(tag => sensitiveTags.has(tag));

  // カテゴリー順位
  const ranked = CATEGORIES.map(c => ({ cat: c, score: catScores[c] })).sort((a, b) => b.score - a.score);

  // やりがい上位2件
  const rewardRanked = Q_REWARD.map(q => {
    const ans = state.answers[q.id];
    return { text: q.text, value: ans ? ans.value : 0 };
  }).sort((a, b) => b.value - a.value);

  // 集中しやすい環境（選択済みの項目 + 作業時間）
  const envSelected = state.answers["env_multi"] || [];
  const envDuration = state.answers["env_duration"] || null;

  return {
    catScores, ranked,
    stressResults, relateBurdenResults,
    sensitiveTags, outreachSensitive,
    rewardRanked, envSelected, envDuration,
  };
}

/* -------------------------------------------------------------------------
   11. 業務マッチング
   ------------------------------------------------------------------------- */

function taskIsOutreach(task) {
  return OUTREACH_KEYWORDS.some(kw => task.includes(kw));
}

function matchBusinesses(scores) {
  const top3 = scores.ranked.slice(0, 3).map(r => r.cat);

  return BUSINESSES.map(biz => {
    const recommended = [];
    const conditional = [];
    top3.forEach(cat => {
      const tasks = biz.tasksByCategory[cat];
      if (!tasks) return;
      tasks.forEach(task => {
        if (scores.outreachSensitive && taskIsOutreach(task)) {
          conditional.push(task);
        } else {
          recommended.push(task);
        }
      });
    });
    return { name: biz.name, recommended: [...new Set(recommended)], conditional: [...new Set(conditional)] };
  }).filter(b => b.recommended.length || b.conditional.length);
}

// 12カテゴリーを「主担当候補 / 条件付き / 避けた方がよい」に分類（カテゴリー単位・一般的な傾向）
function classifyCategories(scores) {
  const main = [], cond = [], avoid = [];
  scores.ranked.forEach((r, idx) => {
    const item = { cat: r.cat, score: r.score, desc: CATEGORY_PHRASES[r.cat] || r.cat };
    if (r.score < 0 || idx >= 9) avoid.push(item);
    else if (idx <= 2) main.push(item);
    else cond.push(item);
  });
  return { main, cond, avoid };
}

/* -------------------------------------------------------------------------
   12. 文章生成
   ------------------------------------------------------------------------- */

function buildNarrative(scores) {
  const top1 = scores.ranked[0];
  const top2 = scores.ranked[1];
  const phrase1 = CATEGORY_PHRASES[top1.cat] || top1.cat;
  const phrase2 = CATEGORY_PHRASES[top2.cat] || top2.cat;

  const topReward = scores.rewardRanked.find(r => r.value > 0);
  const rewardPhrase = topReward ? (REWARD_PHRASES[topReward.text] || "") : "自分に合ったやり方で取り組めると";

  const topStress = scores.stressResults.find(s => s.burden >= 2);
  const stressPhrase = topStress ? (STRESS_PHRASES[topStress.text] || topStress.text) : "興味を持てない仕事";

  return `${phrase1}や、${phrase2}に興味を持ちやすい傾向があります。`
    + `${rewardPhrase}意欲が高まりやすい一方で、${stressPhrase}では手が止まりやすい可能性があります。`;
}

function buildEnvList(scores) {
  const list = [...scores.envSelected];
  if (scores.envDuration) list.push(`作業時間の目安：${scores.envDuration}`);
  return list;
}

/* -------------------------------------------------------------------------
   13. 結果画面の描画
   ------------------------------------------------------------------------- */

function renderResult() {
  const scores = computeScores();
  const maxAbs = Math.max(4, ...scores.ranked.map(r => Math.abs(r.score))) || 1;
  const bizMatches = matchBusinesses(scores);
  const classify = classifyCategories(scores);
  const narrative = buildNarrative(scores);
  const envList = buildEnvList(scores);
  const topStressList = scores.stressResults.filter(s => s.burden > 0).slice(0, 5);
  const top3Names = scores.ranked.slice(0, 3).map(r => r.cat).join("・");

  const rankMedal = ["🥇", "🥈", "🥉"];

  const html = `
  <div class="result-wrap">

    <div class="result-hero">
      <div class="kicker">RESULT</div>
      <h2>あなたの「お仕事たね」診断結果</h2>
      <div class="top-cats">
        ${scores.ranked.slice(0, 3).map((r, i) => `
          <div class="top-cat-card ${i === 0 ? "rank1" : ""}">
            <div class="top-cat-rank">${rankMedal[i]} ${i + 1}位</div>
            <div class="top-cat-name">${r.cat}</div>
            <div class="top-cat-desc">${CATEGORY_ENV_DESC[r.cat] || ""}</div>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="card narrative-card">
      <div class="section-title">📝 あなたの特性</div>
      <p>${narrative}</p>
    </div>

    <div class="card">
      <div class="section-title">📊 12カテゴリー・特性バランス</div>
      ${scores.ranked.map(r => {
        const pct = Math.round(((r.score + maxAbs) / (maxAbs * 2)) * 100);
        return `
        <div class="bar-row">
          <div class="bar-label">${r.cat}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, pct)}%"></div></div>
          <div class="bar-pct">${r.score}</div>
        </div>`;
      }).join("")}
    </div>

    <div class="card list-card">
      <div class="section-title">🌤 力を発揮しやすい環境</div>
      ${envList.length ? `<ul>${envList.map(e => `<li>${e}</li>`).join("")}</ul>`
        : `<p style="color:var(--ink-soft);font-size:14px;">環境の質問が未回答のようです。</p>`}
    </div>

    <div class="card list-card">
      <div class="section-title">🛑 手が止まりやすい条件（上位5件）</div>
      ${topStressList.length ? `<ul>${topStressList.map(s => `<li>${s.text}</li>`).join("")}</ul>`
        : `<p style="color:var(--ink-soft);font-size:14px;">特に強いストレス要因は見られませんでした。</p>`}
    </div>

    <div class="card">
      <div class="section-title">🗂 業務タイプ別の目安（一般的な傾向）</div>
      <p class="classify-lead">特定の事業に関わらず、「どんな性質の業務が向いていそうか」をカテゴリー単位でまとめたものです。具体的な業務名は下の「事業別・おすすめ業務候補」で確認できます。</p>
      <div class="classify-grid">
        <div class="classify-block main">
          <h4>✅ 主担当候補になりやすいタイプ</h4>
          <ul>${classify.main.map(c => `<li><b>${c.cat}</b>：${c.desc}</li>`).join("") || "<li>該当データ不足</li>"}</ul>
        </div>
        <div class="classify-block cond">
          <h4>🟡 条件付きで担当できそうなタイプ</h4>
          <ul>${classify.cond.map(c => `<li><b>${c.cat}</b>：${c.desc}</li>`).join("") || "<li>該当データ不足</li>"}</ul>
        </div>
        <div class="classify-block avoid">
          <h4>⚪ 避けた方がよい可能性があるタイプ</h4>
          <ul>${classify.avoid.map(c => `<li><b>${c.cat}</b>：${c.desc}</li>`).join("") || "<li>該当データ不足</li>"}</ul>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">🏢 事業別・おすすめ業務候補</div>
      <p class="classify-lead">上の「主担当候補」に挙がった${top3Names ? `<b>${top3Names}</b>` : "上位カテゴリー"}を、今の各事業の実際の業務に当てはめるとこうなります。</p>
      ${bizMatches.map(b => `
        <div class="biz-card">
          <h4>${b.name}</h4>
          ${b.recommended.length ? `
            <div class="biz-sub">おすすめ業務</div>
            <div class="tag-list">${b.recommended.map(t => `<span class="tag">${t}</span>`).join("")}</div>
          ` : ""}
          ${b.conditional.length ? `
            <div class="biz-sub">条件付き（進め方の工夫があるとよい業務）</div>
            <div class="tag-list">${b.conditional.map(t => `<span class="tag cond">${t}</span>`).join("")}</div>
            <div class="tag-note">※ 電話や訪問など初対面・即応対応を伴う業務は負担が大きい可能性があります。チャットやメールでの確認、社内の既存関係者向けから始める、事前に質問事項を整理しておくといった工夫がおすすめです。</div>
          ` : ""}
        </div>
      `).join("")}
    </div>

    <div class="card">
      <div class="section-title">🧭 仕事の進め方の希望</div>
      <div class="workstyle-list">
        ${WORKSTYLE_GROUPS.map(g => {
          const ans = state.answers["ws_" + g.key];
          return `<div><b>${g.title}：</b>${ans || "（未回答）"}</div>`;
        }).join("")}
      </div>
    </div>

    <div class="disclaimer">
      この結果は医学的な診断や能力評価ではありません。本人が興味を持ちやすいこと、負担を感じやすいこと、力を発揮しやすい環境を整理し、業務を試す際の参考にするものです。実際の適性は、小さな業務を試しながら確認してください。
    </div>

  </div>
  `;

  el("resultContent").innerHTML = html;
}

/* -------------------------------------------------------------------------
   13.5 Supabaseへの結果送信（1回の診断につき1回だけ送信）
   ------------------------------------------------------------------------- */

async function saveResultToSupabase() {
  if (!supabaseClient) return;      // 未設定なら何もしない
  if (state.resultSaved) return;    // 二重送信防止
  state.resultSaved = true;

  const scores = computeScores();
  const narrative = buildNarrative(scores);

  const payload = {
    nickname: state.nickname || null,
    top_categories: scores.ranked.slice(0, 3).map(r => ({ cat: r.cat, score: r.score })),
    category_scores: scores.catScores,
    narrative,
    answers: state.answers,
  };

  try {
    const { error } = await supabaseClient.from("oshigoto_tane_results").insert(payload);
    if (error) {
      console.error("Supabase insert error:", error);
      showToast("結果の送信に失敗しました（診断結果自体は表示されています）");
    } else {
      showToast("結果を記録しました");
    }
  } catch (e) {
    console.error("Supabase insert exception:", e);
  }
}

/* -------------------------------------------------------------------------
   14. 保存・印刷・コピー・やり直し
   ------------------------------------------------------------------------- */

el("btnPrint").addEventListener("click", () => window.print());

el("btnRestart").addEventListener("click", () => {
  if (!confirm("回答を最初からやり直します。よろしいですか？")) return;
  state.answers = {};
  state.resultSaved = false;
  state.nickname = "";
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
  const nickInput = el("nicknameInput");
  if (nickInput) nickInput.value = "";
  goToStep(-1);
});

el("btnCopy").addEventListener("click", () => {
  const scores = computeScores();
  const narrative = buildNarrative(scores);
  const classify = classifyCategories(scores);
  const envList = buildEnvList(scores);
  const topStressList = scores.stressResults.filter(s => s.burden > 0).slice(0, 5);

  const lines = [];
  lines.push("【お仕事たね診断 結果】");
  lines.push("");
  lines.push("■ 特性上位3カテゴリー");
  scores.ranked.slice(0, 3).forEach((r, i) => lines.push(`${i + 1}位：${r.cat}（${r.score}点）`));
  lines.push("");
  lines.push("■ 特性の文章化");
  lines.push(narrative);
  lines.push("");
  lines.push("■ 力を発揮しやすい環境");
  envList.forEach(e => lines.push("・" + e));
  lines.push("");
  lines.push("■ 手が止まりやすい条件");
  topStressList.forEach(s => lines.push("・" + s.text));
  lines.push("");
  lines.push("■ 主担当候補になりやすいタイプ");
  classify.main.forEach(c => lines.push(`・${c.cat}：${c.desc}`));
  lines.push("");
  lines.push("■ 条件付きで担当できそうなタイプ");
  classify.cond.forEach(c => lines.push(`・${c.cat}：${c.desc}`));
  lines.push("");
  lines.push("■ 避けた方がよい可能性があるタイプ");
  classify.avoid.forEach(c => lines.push(`・${c.cat}：${c.desc}`));
  lines.push("");
  lines.push("※この結果は医学的な診断や能力評価ではありません。");

  const text = lines.join("\n");
  navigator.clipboard?.writeText(text).then(() => {
    showToast("結果をコピーしました");
  }).catch(() => {
    showToast("コピーに失敗しました");
  });
});

/* -------------------------------------------------------------------------
   15. 初期化
   ------------------------------------------------------------------------- */

loadSaved();
goToStep(-1);

/* =========================================================================
   ============================================================
   人生棚卸し (LIFE REVIEW) module — 既存の診断機能とは完全に独立
   優先度A（必須）の範囲のみ実装:
     - 5フェーズのページ追加
     - 各設問への回答（単一選択・複数選択・5段階・短文・自由記述）
     - 途中保存（自動保存・localStorage）
     - 回答の編集・閲覧
     - フェーズ別結果表示
     - スマホ対応
   優先度B/C（出来事カード・テーマ別表示・AI要約・会話用メモ・PDF出力）は今回未実装。
   ============================================================
   ========================================================================= */

/* ---- 質問データ構築用の短縮ヘルパー ---- */
const LR = {
  F: (id, text) => ({ id, type: "free", text }),
  S: (id, text) => ({ id, type: "short", text }),
  SEL: (id, text, options) => ({ id, type: "single", text, options }),
  MULTI: (id, text, options) => ({ id, type: "multi", text, options }),
};

/* ---- フェーズA: 保育園 ---- */
const LR_PHASE_A = {
  key: "youchien", title: "保育園", emoji: "🧸",
  groups: [
    { title: "当時の環境", qs: [
      LR.SEL("A1", "保育園・幼稚園時代のことを、どれくらい覚えていますか？", ["よく覚えている", "一部覚えている", "親や家族から聞いた話が中心", "ほとんど覚えていない"]),
      LR.MULTI("A2", "誰と一緒に過ごすことが多かったですか？", ["母親", "父親", "祖父母", "兄弟・姉妹", "保育士・先生", "友達", "一人で過ごすことが多かった", "その他"]),
      LR.F("A3", "当時、安心できた場所はありましたか？"),
    ]},
    { title: "好きだったこと・得意だったこと", qs: [
      LR.MULTI("A4", "どのような遊びが好きでしたか？", ["外遊び", "お絵描き", "工作", "人形・ぬいぐるみ", "絵本", "テレビ・アニメ", "音楽・歌", "同じ遊びを繰り返す", "一人遊び", "友達との遊び", "覚えていない", "その他"]),
      LR.S("A5", "時間を忘れるほど夢中になったものはありましたか？"),
      LR.F("A6", "周囲から褒められたことや、得意だったことはありますか？"),
    ]},
    { title: "困っていたこと", qs: [
      LR.MULTI("A7", "当時、苦手だった可能性があるものを選んでください。", ["集団行動", "順番を待つ", "急な予定変更", "昼寝", "食事", "着替え", "片付け", "トイレ", "友達と遊ぶ", "気持ちを言葉にする", "感情を落ち着かせる", "音", "光", "におい", "服や物の感触", "特になかった", "覚えていない", "その他"]),
      LR.F("A8", "泣いたり怒ったりしたとき、どのような状態だったと思いますか？"),
      LR.MULTI("A9", "周囲の大人から、どのような子だと思われていたと思いますか？", ["元気", "おとなしい", "落ち着きがない", "手がかかる", "マイペース", "頑固", "人見知り", "よく泣く", "一人で遊ぶ", "変わっている", "覚えていない", "その他"]),
    ]},
    { title: "周囲・相談・支援", qs: [
      LR.F("A10", "安心できる大人はいましたか？"),
      LR.F("A11", "その人のどのようなところが安心できましたか？"),
      LR.F("A12", "苦手だった大人や接し方はありましたか？"),
      LR.F("A13", "当時、どのような大人が近くにいたらよかったと思いますか？"),
      LR.F("A14", "親にしてもらってよかったことはありますか？"),
      LR.F("A15", "親や先生に、してほしくなかったことはありますか？"),
    ]},
    { title: "現在からの振り返り", qs: [
      LR.F("A16", "今振り返ると、発達特性と関係していたかもしれない出来事はありますか？"),
      LR.F("A17", "保育園時代の自分に声をかけるなら、何と言いますか？"),
      LR.F("A18", "同じような子どもを育てている親に伝えたいことはありますか？"),
    ]},
  ],
};

/* ---- フェーズB: 小学校 ---- */
const LR_PHASE_B = {
  key: "shogakko", title: "小学校", emoji: "🎒",
  groups: [
    { title: "当時の環境", qs: [
      LR.SEL("B1", "小学校へ行くことは好きでしたか？", ["とても好き", "どちらかといえば好き", "どちらともいえない", "どちらかといえば嫌い", "とても嫌い"]),
      LR.F("B2", "低学年と高学年で、学校生活の感じ方は変わりましたか？"),
      LR.S("B3", "好きだった教科は何ですか？"),
      LR.S("B4", "苦手だった教科は何ですか？"),
      LR.F("B5", "安心できた場所はどこでしたか？"),
    ]},
    { title: "好き・得意", qs: [
      LR.F("B6", "小学生の頃に夢中になっていたことは何ですか？"),
      LR.F("B7", "周囲から褒められたことは何ですか？"),
      LR.F("B8", "自分では得意だと思っていたことは何ですか？"),
      LR.F("B9", "一人でやることと、誰かとやることでは、どちらが楽でしたか？"),
    ]},
    { title: "学校生活の困りごと", qs: [
      LR.MULTI("B10", "困ったことを選んでください。", ["忘れ物", "宿題", "提出物", "時間割", "机やロッカーの整理", "朝の準備", "遅刻", "授業への集中", "板書", "テスト", "長い説明を聞く", "分からないことを質問する", "集団行動", "体育", "給食", "音やにおい", "友人関係", "先生との関係", "特になかった", "その他"]),
      LR.F("B11", "一番困っていたことは何ですか？"),
      LR.F("B12", "どのような場面で起きていましたか？"),
      LR.F("B13", "周囲には、どのように見られていたと思いますか？"),
      LR.F("B14", "自分の中では、何が起きていたと思いますか？"),
      LR.F("B15", "「やらなければいけない」と分かっていても、できないことはありましたか？"),
      LR.MULTI("B16", "怒られたとき、どのような気持ちでしたか？", ["怖かった", "悲しかった", "腹が立った", "恥ずかしかった", "自分が悪いと思った", "なぜ怒られているか分からなかった", "何も感じなかった", "その場から逃げたかった", "その他"]),
    ]},
    { title: "友人関係", qs: [
      LR.F("B17", "友達は作りやすかったですか？"),
      LR.F("B18", "一人でいる方が楽だと感じることはありましたか？"),
      LR.F("B19", "仲間外れ、いじめ、からかいなどはありましたか？"),
      LR.F("B20", "友達とのトラブルが起きたとき、その理由を理解できましたか？"),
      LR.F("B21", "周囲に合わせるために、無理をしていたことはありますか？"),
    ]},
    { title: "親・先生との関係", qs: [
      LR.F("B22", "親に言えなかったことはありましたか？"),
      LR.F("B23", "先生に言えなかったことはありましたか？"),
      LR.F("B24", "困っていることを家で話せましたか？"),
      LR.F("B25", "親から言われて嫌だった言葉や接し方はありますか？"),
      LR.F("B26", "親から言われて助かった言葉や接し方はありますか？"),
      LR.F("B27", "先生から言われて印象に残っていることはありますか？"),
    ]},
    { title: "相談・支援", qs: [
      LR.MULTI("B28", "困ったとき、誰に相談していましたか？", ["母親", "父親", "兄弟・姉妹", "祖父母", "担任", "別の先生", "保健室の先生", "友達", "誰にも相談しなかった", "その他"]),
      LR.MULTI("B29", "相談しなかったことがある場合、その理由は何ですか？", ["怒られそうだった", "心配をかけたくなかった", "恥ずかしかった", "説明の仕方が分からなかった", "自分でも何に困っているか分からなかった", "大したことではないと思った", "信頼できる人がいなかった", "その他"]),
      LR.F("B30", "どのような人なら相談しやすかったと思いますか？"),
      LR.F("B31", "同じ障がいや特性を持つ年上の人がいたら、何を聞きたかったですか？"),
      LR.F("B32", "当時、親や先生以外の相談相手は必要だったと思いますか？"),
    ]},
    { title: "振り返り", qs: [
      LR.F("B33", "小学校での経験は、中学校以降にどのような影響を与えましたか？"),
      LR.F("B34", "今も残っている苦手意識はありますか？"),
      LR.F("B35", "現在の強みにつながっていることはありますか？"),
      LR.F("B36", "小学生の自分に声をかけるなら、何と言いますか？"),
      LR.F("B37", "同じようなことで困っている小学生に伝えたいことはありますか？"),
      LR.F("B38", "その子の親に伝えたいことはありますか？"),
    ]},
  ],
};

/* ---- フェーズC: 中学校 ---- */
const LR_PHASE_C = {
  key: "chugakko", title: "中学校", emoji: "📘",
  groups: [
    { title: "環境の変化", qs: [
      LR.F("C1", "中学校に入って、一番大きく変わったことは何ですか？"),
      LR.F("C2", "教科ごとに先生が変わることをどう感じましたか？"),
      LR.F("C3", "持ち物や提出物の管理は、小学校より難しくなりましたか？"),
      LR.F("C4", "部活動には参加していましたか？"),
      LR.F("C5", "学校へ行くことをどう感じていましたか？"),
    ]},
    { title: "学習・自己管理", qs: [
      LR.F("C6", "定期テストの勉強計画を立てられましたか？"),
      LR.F("C7", "長期課題や提出期限を管理できましたか？"),
      LR.F("C8", "やるべきことを後回しにすることはありましたか？"),
      LR.F("C9", "遅刻・欠席・忘れ物はありましたか？"),
      LR.F("C10", "睡眠や生活リズムで困ることはありましたか？"),
      LR.F("C11", "学校生活で疲れ切ってしまうことはありましたか？"),
      LR.F("C12", "一番困っていたことは何ですか？"),
      LR.F("C13", "周囲にはどう見えていたと思いますか？"),
      LR.F("C14", "本人の中では何が起きていましたか？"),
    ]},
    { title: "人間関係・思春期", qs: [
      LR.F("C15", "友人関係は小学校から変わりましたか？"),
      LR.F("C16", "グループ内の暗黙のルールで困ることはありましたか？"),
      LR.F("C17", "周囲に合わせるために無理をしていましたか？"),
      LR.F("C18", "自分の見た目や性格をどう感じていましたか？"),
      LR.F("C19", "恋愛や異性関係で困ったことはありましたか？"),
      LR.F("C20", "親には言えない悩みがありましたか？"),
      LR.F("C21", "家に帰ると強く疲れていたことはありましたか？"),
    ]},
    { title: "親・先生との関係", qs: [
      LR.F("C22", "親と話す時間や内容は変わりましたか？"),
      LR.F("C23", "親に言われて嫌だったことは何ですか？"),
      LR.F("C24", "親に気づいてほしかったことは何ですか？"),
      LR.F("C25", "周囲から反抗期だと思われていたものの、本当は困っていたことはありますか？"),
      LR.F("C26", "先生にはどこまで本音を話せましたか？"),
    ]},
    { title: "相談・支援", qs: [
      LR.F("C27", "学校内に相談できる人はいましたか？"),
      LR.F("C28", "相談相手が先生しかいなかったことで、困ったことはありますか？"),
      LR.F("C29", "少し年上の当事者なら話せたと思いますか？"),
      LR.MULTI("C30", "どのような場所なら相談しやすかったと思いますか？", ["学校", "学校外の施設", "自宅の近く", "カフェなど堅くない場所", "対面", "電話", "LINE・チャット", "匿名", "その他"]),
      LR.F("C31", "当時、どんな大人が近くにいたらよかったですか？"),
    ]},
    { title: "進路", qs: [
      LR.F("C32", "高校進学について、どのように考えていましたか？"),
      LR.F("C33", "自分に合う高校を選べたと思いますか？"),
      LR.F("C34", "親や先生の意見に流された部分はありますか？"),
      LR.F("C35", "当時知っておきたかった進路情報はありますか？"),
    ]},
    { title: "振り返り", qs: [
      LR.F("C36", "中学生の自分に声をかけるなら、何と言いますか？"),
      LR.F("C37", "同じようなことで悩む中学生に伝えたいことはありますか？"),
      LR.F("C38", "その子の親に伝えたいことはありますか？"),
    ]},
  ],
};

/* ---- フェーズD: 高校 ---- */
const LR_PHASE_D = {
  key: "kouko", title: "高校", emoji: "🏫",
  groups: [
    { title: "学校・生活", qs: [
      LR.F("D1", "高校はどのように選びましたか？"),
      LR.F("D2", "その高校は自分に合っていたと思いますか？"),
      LR.F("D3", "授業・課題・出席の管理はできましたか？"),
      LR.F("D4", "友人関係はどうでしたか？"),
      LR.F("D5", "部活動やアルバイトはしていましたか？"),
      LR.F("D6", "高校生活で一番楽しかったことは何ですか？"),
      LR.F("D7", "一番つらかったことは何ですか？"),
    ]},
    { title: "自立・自己管理", qs: [
      LR.F("D8", "自分で予定を管理できましたか？"),
      LR.F("D9", "朝起きる、身支度、通学は負担でしたか？"),
      LR.F("D10", "お金を自分で管理できましたか？"),
      LR.F("D11", "親に頼っていたことは何ですか？"),
      LR.F("D12", "自分ではできると思っていたものの、実際には難しかったことはありますか？"),
      LR.F("D13", "周囲にはどう見えていたと思いますか？"),
      LR.F("D14", "本人の中では何が起きていましたか？"),
    ]},
    { title: "障がい・自己理解", qs: [
      LR.F("D15", "自分の障がいや特性について、どの程度理解していましたか？"),
      LR.F("D16", "障がいを周囲に公表していましたか？"),
      LR.F("D17", "公表していなかった場合、その理由は何ですか？"),
      LR.F("D18", "障がいを隠すことで困ったことはありましたか？"),
      LR.F("D19", "自分の得意・苦手を説明できましたか？"),
      LR.F("D20", "必要な配慮を周囲に伝えられましたか？"),
      LR.F("D21", "自分が周囲と違うことを、どのように受け止めていましたか？"),
    ]},
    { title: "進路・将来", qs: [
      LR.F("D22", "卒業後の進路をいつ頃考え始めましたか？"),
      LR.F("D23", "やりたいことや、なりたい職業はありましたか？"),
      LR.F("D24", "自分に向いている仕事を理解していましたか？"),
      LR.F("D25", "進路情報は誰から得ましたか？"),
      LR.F("D26", "一般雇用と障がい者雇用について知っていましたか？"),
      LR.F("D27", "将来にどのような不安がありましたか？"),
      LR.F("D28", "成人した障がい当事者と話せる機会があれば、何を聞きたかったですか？"),
    ]},
    { title: "相談・支援", qs: [
      LR.F("D29", "進路や就職について相談できる人はいましたか？"),
      LR.F("D30", "親にはどこまで本音を話せましたか？"),
      LR.F("D31", "先生への相談で役に立ったことは何ですか？"),
      LR.F("D32", "先生に相談しても解決しなかったことはありますか？"),
      LR.F("D33", "当時どのような大人が近くにいたらよかったですか？"),
      LR.F("D34", "親に準備してほしかったことはありますか？"),
    ]},
    { title: "振り返り", qs: [
      LR.F("D35", "高校時代に知っておきたかったことは何ですか？"),
      LR.F("D36", "高校生の自分に声をかけるなら、何と言いますか？"),
      LR.F("D37", "同じ悩みを持つ高校生に伝えたいことはありますか？"),
      LR.F("D38", "その子の親に伝えたいことはありますか？"),
    ]},
  ],
};

/* ---- フェーズE: 社会人 ---- */
const LR_PHASE_E = {
  key: "shakaijin", title: "社会人", emoji: "💼",
  groups: [
    { title: "就職前後", qs: [
      LR.F("E1", "最初の仕事は、どのように決めましたか？"),
      LR.F("E2", "一般雇用・障がい者雇用のどちらでしたか？"),
      LR.F("E3", "仕事を始める前の想像と、実際の働き方に違いはありましたか？"),
      LR.F("E4", "最初に困ったことは何ですか？"),
      LR.F("E5", "仕事内容は自分の特性に合っていたと思いますか？"),
      LR.F("E6", "周囲にはどのように見られていたと思いますか？"),
      LR.F("E7", "本人の中では何が起きていましたか？"),
    ]},
    { title: "仕事上の困りごと", qs: [
      LR.MULTI("E8", "困ったことを選んでください。", ["曖昧な指示", "複数業務の同時進行", "優先順位", "分からないことを質問する", "ミスへの対応", "納期管理", "時間管理", "遅刻・欠勤", "集中力", "体力・疲れやすさ", "職場の人間関係", "雑談", "電話対応", "急な予定変更", "音や環境", "特になかった", "その他"]),
      LR.F("E9", "一番大きな困りごとは何でしたか？"),
      LR.F("E10", "どのような指示なら理解しやすかったですか？"),
      LR.F("E11", "ミスをしたとき、どのような気持ちになりましたか？"),
      LR.F("E12", "分からないときに質問できなかったことはありますか？"),
      LR.F("E13", "仕事を辞めたいと思ったことはありますか？"),
      LR.F("E14", "その理由は何でしたか？"),
    ]},
    { title: "障がい者雇用・配慮", qs: [
      LR.F("E15", "障がい者雇用で助かった配慮はありますか？"),
      LR.F("E16", "障がい者雇用に対する不満や違和感はありましたか？"),
      LR.F("E17", "必要な配慮を自分から説明できましたか？"),
      LR.F("E18", "会社や支援者に理解してほしかったことはありますか？"),
      LR.F("E19", "一般雇用と障がい者雇用について、良かった点・難しかった点を教えてください。"),
    ]},
    { title: "生活・自立", qs: [
      LR.F("E20", "仕事と家事の両立はできましたか？"),
      LR.F("E21", "お金の管理で困りましたか？"),
      LR.F("E22", "生活リズムで困りましたか？"),
      LR.F("E23", "人付き合い、恋愛、結婚で困ることはありましたか？"),
      LR.F("E24", "一人では難しく、誰かのサポートが必要なことは何ですか？"),
      LR.F("E25", "反対に、一人でも問題なくできることは何ですか？"),
      LR.F("E26", "大人になってから強みとして発揮できた特性はありますか？"),
    ]},
    { title: "過去からの影響", qs: [
      LR.F("E27", "子どもの頃の経験が、仕事に影響したことはありますか？"),
      LR.F("E28", "小学生の頃から準備できたかもしれないことはありますか？"),
      LR.F("E29", "中学生・高校生の頃に知っておきたかったことはありますか？"),
      LR.F("E30", "親にしてもらってよかったことは何ですか？"),
      LR.F("E31", "親にしてほしかったことは何ですか？"),
    ]},
    { title: "現在からのメッセージ", qs: [
      LR.F("E32", "社会人になった自分から、子ども時代の自分に何を伝えたいですか？"),
      LR.F("E33", "同じような特性を持つ子どもに、将来について何を伝えたいですか？"),
      LR.F("E34", "その子の親に何を伝えたいですか？"),
      LR.F("E35", "今の自分に必要な相談相手や支援は、どのようなものですか？"),
    ]},
  ],
};

const LIFE_PHASES = [LR_PHASE_A, LR_PHASE_B, LR_PHASE_C, LR_PHASE_D, LR_PHASE_E];

/* -------------------------------------------------------------------------
   人生棚卸し: 状態管理・保存
   ------------------------------------------------------------------------- */

const LR_STORAGE_KEY = "life_review_answers_v1";

// lrData構造: { [phaseKey]: { answers: { [qid]: value }, skipped: { [qid]: true }, completed: bool } }
let lrData = {};

function lrFlatQuestions(phase) {
  const list = [];
  phase.groups.forEach(g => g.qs.forEach(q => list.push({ ...q, groupTitle: g.title })));
  return list;
}
function lrTotalCount(phase) { return lrFlatQuestions(phase).length; }

function lrLoad() {
  try {
    const raw = localStorage.getItem(LR_STORAGE_KEY);
    lrData = raw ? JSON.parse(raw) : {};
  } catch (e) { lrData = {}; }
  LIFE_PHASES.forEach(p => {
    if (!lrData[p.key]) lrData[p.key] = { answers: {}, skipped: {}, completed: false };
  });
}
function lrPersist() {
  try { localStorage.setItem(LR_STORAGE_KEY, JSON.stringify(lrData)); } catch (e) { /* noop */ }
}

function lrAnsweredCount(phase) {
  const d = lrData[phase.key];
  const flat = lrFlatQuestions(phase);
  return flat.filter(q => {
    const v = d.answers[q.id];
    if (d.skipped[q.id]) return true;
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && String(v).trim() !== "";
  }).length;
}
function lrPhaseStatus(phase) {
  const answered = lrAnsweredCount(phase);
  const total = lrTotalCount(phase);
  const d = lrData[phase.key];
  if (d.completed) return "done";
  if (answered === 0) return "notstarted";
  return "inprogress";
}

/* -------------------------------------------------------------------------
   人生棚卸し: 画面状態
   ------------------------------------------------------------------------- */

const lrState = {
  screen: "home",   // home | phase | view
  phaseKey: null,
  page: 0,          // ページ（3〜4問ずつ）
  PAGE_SIZE: 4,
};

const lrStage = () => document.getElementById("lrStage");
const lrNavbar = () => document.getElementById("lrNavbar");
const lrHeaderInfo = () => document.getElementById("lrHeaderInfo");
const lrProgressTrack = () => document.getElementById("lrProgressTrack");
const lrProgressFill = () => document.getElementById("lrProgressFill");

function lrPhaseByKey(key) { return LIFE_PHASES.find(p => p.key === key); }

function lrGoHome() {
  lrState.screen = "home";
  lrState.phaseKey = null;
  lrRender();
}
function lrGoPhase(key, page) {
  lrState.screen = "phase";
  lrState.phaseKey = key;
  lrState.page = page || 0;
  lrRender();
}
function lrGoView(key) {
  lrState.screen = "view";
  lrState.phaseKey = key;
  lrRender();
}

/* -------------------------------------------------------------------------
   人生棚卸し: レンダリング
   ------------------------------------------------------------------------- */

function lrRender() {
  if (lrState.screen === "home") return lrRenderHome();
  if (lrState.screen === "phase") return lrRenderPhase();
  if (lrState.screen === "view") return lrRenderView();
}

function lrRenderHome() {
  lrHeaderInfo().innerHTML = "";
  lrProgressTrack().style.display = "none";
  lrNavbar().setAttribute("data-visible", "false");

  const doneCount = LIFE_PHASES.filter(p => lrPhaseStatus(p) === "done").length;

  const cardsHtml = LIFE_PHASES.map(p => {
    const status = lrPhaseStatus(p);
    const answered = lrAnsweredCount(p);
    const total = lrTotalCount(p);
    const pct = Math.round((answered / total) * 100);
    const statusLabel = status === "done" ? "回答済み" : status === "inprogress" ? "回答中" : "未回答";
    const btnLabel = answered === 0 ? "回答する" : "続きを回答する";
    return `
      <div class="lr-phase-card ${status === "done" ? "done" : status === "inprogress" ? "inprogress" : ""}">
        <div class="lr-phase-top">
          <div class="lr-phase-name">${p.emoji} ${p.title}</div>
          <div class="lr-phase-status ${status === "done" ? "done" : status === "inprogress" ? "inprogress" : ""}">${statusLabel}</div>
        </div>
        <div class="lr-phase-count">${total}問中${answered}問回答済み</div>
        <div class="lr-phase-bar-track"><div class="lr-phase-bar-fill" style="width:${Math.max(3, pct)}%"></div></div>
        <div class="lr-phase-actions">
          <button class="btn btn-primary" onclick="lrGoPhase('${p.key}')">${btnLabel}</button>
          ${answered > 0 ? `<button class="btn btn-outline" onclick="lrGoView('${p.key}')">回答を見る</button>` : ""}
        </div>
      </div>
    `;
  }).join("");

  lrStage().innerHTML = `
    <div class="card lr-intro-card">
      <div class="intro-emoji">📖🌿</div>
      <h1>人生棚卸し</h1>
      <p class="intro-lead">保育園から社会人まで、これまでの経験を少しずつ振り返るためのページです。一気に答える必要はありません。答えたくない質問は、回答せずに進めることができます。</p>
      <div class="lr-notice">
        このアンケートは、これまでの経験を振り返るためのものです。医療的な診断や心理検査ではありません。答えたくない質問は、回答せずに進めることができます。回答はこの端末の中に保存され、外部には送信されません。
      </div>
      <div class="lr-overall-progress">人生棚卸し進捗：5フェーズ中${doneCount}フェーズ完了</div>
    </div>
    <div class="lr-phase-grid">${cardsHtml}</div>
  `;
}

function lrRenderPhase() {
  const phase = lrPhaseByKey(lrState.phaseKey);
  const flat = lrFlatQuestions(phase);
  const totalPages = Math.ceil(flat.length / lrState.PAGE_SIZE);
  const isDonePage = lrState.page >= totalPages;

  lrProgressTrack().style.display = "block";
  lrNavbar().setAttribute("data-visible", "true");

  const answeredSoFar = lrAnsweredCount(phase);
  lrHeaderInfo().innerHTML = `<span>${phase.emoji} ${phase.title}（${answeredSoFar}／${flat.length}問）</span>`;

  if (isDonePage) {
    lrProgressFill().style.width = "100%";
    lrStage().innerHTML = `
      <div class="card lr-phase-done-card">
        <div class="emoji">🌿</div>
        <h2>${phase.title}の質問はここまでです</h2>
        <p style="color:var(--ink-soft);font-size:14.5px;">お疲れさまでした。空欄のままでも大丈夫です。あとから続きを編集することもできます。</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px;">
          <button class="btn btn-outline" onclick="lrGoView('${phase.key}')">回答を見る・編集する</button>
          <button class="btn btn-primary" onclick="lrMarkComplete('${phase.key}')">このフェーズを完了にする</button>
        </div>
      </div>
    `;
    el("lrBtnNext").style.visibility = "hidden";
    el("lrBtnPrev").style.visibility = totalPages > 0 ? "visible" : "hidden";
    el("lrBtnPause").textContent = "トップへ戻る";
    return;
  }

  const pct = Math.round(((lrState.page + 1) / totalPages) * 100);
  lrProgressFill().style.width = pct + "%";

  const pageItems = flat.slice(lrState.page * lrState.PAGE_SIZE, (lrState.page + 1) * lrState.PAGE_SIZE);
  const d = lrData[phase.key];

  let lastGroupTitle = null;
  const itemsHtml = pageItems.map(q => {
    let groupHtml = "";
    if (q.groupTitle !== lastGroupTitle) {
      groupHtml = `<div class="lr-group-title">◆ ${q.groupTitle}</div>`;
      lastGroupTitle = q.groupTitle;
    }
    return groupHtml + lrRenderQuestion(q, phase.key, d);
  }).join("");

  lrStage().innerHTML = `<div class="card question-card">${itemsHtml}</div>`;

  el("lrBtnNext").style.visibility = "visible";
  el("lrBtnNext").textContent = (lrState.page === totalPages - 1) ? "最後へ →" : "次へ →";
  el("lrBtnPrev").style.visibility = lrState.page === 0 ? "hidden" : "visible";
  el("lrBtnPause").textContent = "一時保存して終了";
}

function lrRenderQuestion(q, phaseKey, d) {
  const skipped = !!d.skipped[q.id];
  const value = d.answers[q.id];

  let bodyHtml = "";
  if (q.type === "single") {
    bodyHtml = `<div class="opt-list">${q.options.map(opt => `
      <div class="opt-chip radio ${value === opt ? "selected" : ""}" onclick="lrSetSingle('${phaseKey}','${q.id}', this, ${JSON.stringify(opt)})">
        <span class="mark">${value === opt ? "●" : ""}</span><span>${opt}</span>
      </div>`).join("")}</div>`;
  } else if (q.type === "multi") {
    const arr = Array.isArray(value) ? value : [];
    bodyHtml = `<div class="opt-list">${q.options.map(opt => `
      <div class="opt-chip ${arr.includes(opt) ? "selected" : ""}" onclick="lrToggleMulti('${phaseKey}','${q.id}', this, ${JSON.stringify(opt)})">
        <span class="mark">${arr.includes(opt) ? "✓" : ""}</span><span>${opt}</span>
      </div>`).join("")}</div>`;
  } else if (q.type === "short") {
    bodyHtml = `<input type="text" class="lr-q-input" placeholder="短い言葉で大丈夫です" value="${value ? escapeHtml(value) : ""}" ${skipped ? "disabled" : ""}
      oninput="lrSetText('${phaseKey}','${q.id}', this.value)">`;
  } else { // free
    bodyHtml = `<textarea class="lr-q-textarea" placeholder="きれいな文章にする必要はありません。単語や短い文章でも大丈夫です。" ${skipped ? "disabled" : ""}
      oninput="lrSetText('${phaseKey}','${q.id}', this.value)">${value ? escapeHtml(value) : ""}</textarea>
      <div class="lr-q-hint">きれいな文章にする必要はありません。単語や短い文章でも大丈夫です。</div>`;
  }

  const skipRow = (q.type === "free" || q.type === "short") ? `
    <div class="lr-skip-row">
      <button type="button" class="lr-skip-btn ${skipped ? "active" : ""}" onclick="lrToggleSkip('${phaseKey}','${q.id}')">
        ${skipped ? "✕ この質問への回答をスキップ中（クリックで解除）" : "この質問は回答しない（スキップ）"}
      </button>
    </div>` : "";

  return `
    <div class="lr-q-block">
      <div class="lr-q-text">${q.text}</div>
      ${bodyHtml}
      ${skipRow}
    </div>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---- 回答セット関数（グローバルに公開してonclick/oninputから呼べるようにする） ---- */
function lrSetSingle(phaseKey, qid, elm, value) {
  lrData[phaseKey].answers[qid] = value;
  lrData[phaseKey].skipped[qid] = false;
  lrPersist();
  const parent = elm.parentElement;
  parent.querySelectorAll(".opt-chip").forEach(c => { c.classList.remove("selected"); c.querySelector(".mark").textContent = ""; });
  elm.classList.add("selected");
  elm.querySelector(".mark").textContent = "●";
}
function lrToggleMulti(phaseKey, qid, elm, value) {
  const d = lrData[phaseKey];
  if (!Array.isArray(d.answers[qid])) d.answers[qid] = [];
  const arr = d.answers[qid];
  const i = arr.indexOf(value);
  if (i >= 0) { arr.splice(i, 1); elm.classList.remove("selected"); elm.querySelector(".mark").textContent = ""; }
  else { arr.push(value); elm.classList.add("selected"); elm.querySelector(".mark").textContent = "✓"; }
  d.skipped[qid] = false;
  lrPersist();
}
function lrSetText(phaseKey, qid, value) {
  lrData[phaseKey].answers[qid] = value;
  lrPersist();
  // ホーム画面のカウント表示更新のため、フッター情報のみ軽量更新
  const phase = lrPhaseByKey(phaseKey);
  const answered = lrAnsweredCount(phase);
  const flat = lrFlatQuestions(phase);
  const info = lrHeaderInfo();
  if (info) info.innerHTML = `<span>${phase.emoji} ${phase.title}（${answered}／${flat.length}問）</span>`;
}
function lrToggleSkip(phaseKey, qid) {
  const d = lrData[phaseKey];
  d.skipped[qid] = !d.skipped[qid];
  if (d.skipped[qid]) d.answers[qid] = "";
  lrPersist();
  lrRenderPhase();
}
function lrMarkComplete(phaseKey) {
  lrData[phaseKey].completed = true;
  lrPersist();
  showToast("フェーズを完了として保存しました");
  lrGoHome();
}

/* ---- 閲覧・編集画面 ---- */
function lrRenderView() {
  const phase = lrPhaseByKey(lrState.phaseKey);
  const flat = lrFlatQuestions(phase);
  const d = lrData[phase.key];

  lrHeaderInfo().innerHTML = `<span>${phase.emoji} ${phase.title}の回答</span>`;
  lrProgressTrack().style.display = "none";
  lrNavbar().setAttribute("data-visible", "false");

  let lastGroupTitle = null;
  const itemsHtml = flat.map(q => {
    let groupHtml = "";
    if (q.groupTitle !== lastGroupTitle) {
      groupHtml = `<div class="lr-group-title">◆ ${q.groupTitle}</div>`;
      lastGroupTitle = q.groupTitle;
    }
    const v = d.answers[q.id];
    const skipped = !!d.skipped[q.id];
    let displayVal;
    if (skipped) displayVal = "（スキップ）";
    else if (Array.isArray(v) && v.length) displayVal = v.join("、");
    else if (v && String(v).trim() !== "") displayVal = v;
    else displayVal = "（未回答）";
    const isEmpty = displayVal === "（未回答）";
    return groupHtml + `
      <div class="lr-view-item">
        <div class="lr-view-q">${q.text}</div>
        <div class="lr-view-a ${isEmpty ? "empty" : ""}">${escapeHtml(displayVal)}</div>
      </div>
    `;
  }).join("");

  lrStage().innerHTML = `
    <div class="card">
      <button class="lr-back-link" onclick="lrGoHome()">← 人生棚卸しトップへ戻る</button>
      <div class="section-title">${phase.emoji} ${phase.title}の回答内容</div>
      <p style="font-size:13px;color:var(--ink-soft);margin-top:-6px;">続きから回答・修正したい場合は、下のボタンから編集画面に進めます。</p>
      <div style="margin:14px 0 20px;">
        <button class="btn btn-primary" onclick="lrGoPhase('${phase.key}', 0)">回答を編集する</button>
      </div>
      ${itemsHtml}
    </div>
  `;
}

/* -------------------------------------------------------------------------
   人生棚卸し: ナビゲーション操作
   ------------------------------------------------------------------------- */

el("lrBtnNext")?.addEventListener("click", () => {
  const phase = lrPhaseByKey(lrState.phaseKey);
  const totalPages = Math.ceil(lrFlatQuestions(phase).length / lrState.PAGE_SIZE);
  lrState.page = Math.min(lrState.page + 1, totalPages);
  lrRenderPhase();
  lrStage().scrollIntoView({ block: "start" });
});
el("lrBtnPrev")?.addEventListener("click", () => {
  if (lrState.page === 0) { lrGoHome(); return; }
  lrState.page = Math.max(0, lrState.page - 1);
  lrRenderPhase();
});
el("lrBtnPause")?.addEventListener("click", () => { lrGoHome(); });

/* -------------------------------------------------------------------------
   モード切替（業務診断 ⇔ 人生棚卸し）
   ------------------------------------------------------------------------- */

function setAppMode(mode) {
  document.getElementById("diagnosisApp").style.display = mode === "diagnosis" ? "" : "none";
  document.getElementById("lifeReviewApp").style.display = mode === "lifereview" ? "" : "none";
  document.getElementById("modeBtnDiagnosis").classList.toggle("active", mode === "diagnosis");
  document.getElementById("modeBtnLifereview").classList.toggle("active", mode === "lifereview");
  if (mode === "lifereview") { lrLoad(); lrGoHome(); }
}
document.getElementById("modeBtnDiagnosis")?.addEventListener("click", () => setAppMode("diagnosis"));
document.getElementById("modeBtnLifereview")?.addEventListener("click", () => setAppMode("lifereview"));

/* 初期モード */
setAppMode("diagnosis");
