# NeoLeverage コーポレートサイト（試作）

現行サイト（https://neolev.jp/ 、Framer + microCMS）を置き換えるための最初の試作です。Astro で静的 HTML を出し、モーションは GSAP、コンテンツは microCMS（認証情報が無いときはモック）です。Cloudflare Pages の無料プランへ載せられる形にしてあります。このリポジトリでは Pages プロジェクト、DNS、Resend、Turnstile、microCMS の新 API は作っていません。公開に必要な外部設定は、その都度オーナーの承認が必要です。

## ローカル

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ を生成し、出力検査まで行う
npm run preview  # 生成済みの dist/ を配信
npm run test:contact
```

Node.js 22 を想定しています。`npm install` 時に undici の engine 警告が出ることがあります（22.19 以上を求める依存）。ビルド自体は 22.14 で通っています。

認証情報は不要です。`MICROCMS_SERVICE_DOMAIN` か `MICROCMS_API_KEY` が空、または API が失敗したときは `src/lib/microcms/mock.ts` を使います。

## 環境変数

`.env.example` を `.env` にコピーします。値はコミットしません。

| 変数 | いつ読むか | 空のとき |
|---|---|---|
| `MICROCMS_SERVICE_DOMAIN` | ビルド時のみ | モック |
| `MICROCMS_API_KEY` | ビルド時のみ | モック |
| `MEDIA_HOST` | ビルド時。記事画像の取得元ホスト | `pub-dbe0635cce4240dda8b7b3874f631e3f.r2.dev` |
| `PUBLIC_GTM_CONTAINER_ID` | ブラウザ。`GTM-` で始まる ID だけ埋め込む | タグなし（現行サイトの ID は `GTM-N4ZPT9WH`。DMP `kitchen.juicer.cc` もこのタグ経由） |
| `PUBLIC_TURNSTILE_SITE_KEY` | ブラウザ。ウィジェット表示 | ウィジェットなし。試作である旨を表示 |
| `TURNSTILE_SECRET_KEY` | Pages Function のみ | 検証をスキップ |
| `RESEND_API_KEY` | Pages Function のみ | 送信せず `{ ok: true, mocked: true }` |
| `CONTACT_TO` | Pages Function のみ | `contract@neolev.jp`（HTML には出さない） |
| `CONTACT_FROM` | Pages Function のみ。Resend で検証済みの送信元 | 未設定なら実送信しない |

`CONTACT_TO` のアドレスと法人番号は、ページ本文・フッター・llms.txt には出しません。法人番号 `1290001111832` は Organization の JSON-LD（`taxID` / `iso6523Code` / `identifier`）だけです。適格請求書の登録番号は使いません。

## Cloudflare Pages（手順のメモ。プロジェクトは未作成）

承認後にダッシュボードで作るときの値です。

- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `dist`
- ルート: リポジトリ直下
- Functions: `functions/`（`/api/contact` は `functions/api/contact.ts`）
- 本番の環境変数は上の表を Pages の設定に入れる。`PUBLIC_` 以外はビルドにも Function にも必要なら両方へ
- `public/_redirects` と `public/_headers` は Pages がそのまま使います
- `www` から apex への 301 と DNS は、ゾーンの場所を確認してから設定します

`astro preview` は Functions を動かしません。フォームは `/api/contact` が 404 のときも完了画面へ進み、送信を模擬した扱いにします。Function を直接試すときは `npm run test:contact` です。

## 構成

- `src/pages` … ルート。JA が直下、EN が `/en`
- `src/views` … JA/EN で共有するページ
- `src/lib/microcms` … 型、取得、モック
- `src/lib/seo` … JSON-LD、サイトマップ対象
- `src/animations` … トップの水面（案A）とスクロール演出
- `functions/api/contact.ts` … 入力検証、Turnstile、Resend
- `public/logo.png` … マークを正八角形で切り、1200×1200 の透明地に 1000×1000 で中央配置（JSON-LD のロゴ）
- 画面上の社名は `src/assets/brand/wordmark.svg`（`currentColor`）。マークは 256px の WebP を八角形でクリップ
- トップの水面は `src/animations/mv-water.glsl`（WebGL2、だめなときは WebGL1）。Three.js は使いません
- 静止画は `public/mv/`（満帆のシェーダー書き出し）。`?tier=0|1|2|3` で品質段階を固定、`?oct=1` は太陽フレアの八角形（通常はオフ）

## モーションとライセンス

GSAP 3（MorphSVG を含む）は Standard "no charge" license です。https://gsap.com/standard-license  
この試作は公開サイトのアニメーションに使い、有料プラグインの別契約は不要です。MorphSVG は帆のシェイプだけに使い、ページ全体の JS 予算からは分けて測ります。

`prefers-reduced-motion` は段階 0（静止画のみ）。`saveData`、WebGL 不可、SwiftShader / llvmpipe、`deviceMemory<=2`、`hardwareConcurrency<=4` は段階 1（静止画 + SVG の帆と風の線）。粗いポインタは段階 2、それ以外は段階 3 です。

canonical は `/` と `/en/` だけ末尾スラッシュありです。ほかはスラッシュなしです。

## まだプレースホルダーのもの

- microCMS の新 API（`site_settings`、`service_areas`、`services`、`faqs`、`notices`、`insight_categories`、`tags`、`insights`、`pages`）は未接続。現行 Framer 用の API は変更していません。フィールドの対応は `docs/microcms-schema.md`
- サービス詳細の一部、編集方針、Trends の本文は「試作」と表示しています。現行サイトにある文言（ブランド、事業、会社概要、お知らせ、記事の見出しと要約）は再掲しています
- Trends は現行の全件（日本語 169、英語 169）ではなくサンプルです。英語本文は未移行のため、英語の記事ページは noindex です
- 記事画像の R2 パイプラインは繋がっていますが、公開 HTML にオブジェクトキーが無かったため、試作のアイキャッチはローカル生成の `src/assets/covers/horizon.png` です。CMS が R2 の URL を返せば、ビルド時に Astro が最適化します。将来のホストは `MEDIA_HOST`（例: `media.neolev.jp`）
- 期間の週数、料金、事例、電話番号、メールアドレス、個人名は載せていません
- OGP の既定画像 `public/og-default.png` は、満帆の水面フレームにワードマークと Outfit の見出しを載せた試作です。写真ではありません
- 英語のサービス文と編集方針は未校閲の訳です
- お問い合わせは、Resend の鍵が無いあいだ送信を模擬します

オーナー確認が必要な点は `docs/owner-decisions.md` にまとめています。
