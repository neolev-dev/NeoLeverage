# microCMS スキーマ（試作）

現行の Framer 用 API は変更しない。新サイト用に、次のエンドポイントを新規で作る想定です。1 エントリに日本語と英語を両方持ちます。言語で分かれる項目は `_ja` / `_en` です。

認証情報が無いビルドは `src/lib/microcms/mock.ts` を使います。型の正本は `src/lib/microcms/types.ts` です。

## エンドポイント

| API | 種別 | 用途 |
|---|---|---|
| `site_settings` | オブジェクト | 社名、説明、拠点、編集部名、llms 導入文、`ai_crawler_policy`、`corporate_number` |
| `service_areas` | リスト | creative / marketing / ai。アンカーは `cr` / `ma` / `ai` |
| `services` | リスト | 個別サービス。`area` と `slug` |
| `faqs` | リスト | 共通 FAQ とサービスへの参照 |
| `notices` | リスト | 現行番号を `slug` に維持（01, 02, 03, 05, 07, 08, 09, 10, 11, 12） |
| `insight_categories` | リスト | Trends のカテゴリ。一覧は index |
| `tags` | リスト | タグ。ページは noindex、sitemap 外 |
| `insights` | リスト | Trends。現行 ID を `slug` に維持 |
| `pages` | リスト | `privacy` と `editorial-policy` |

作りません: `people`、`case_studies`、Lab 用 API。

## 共通 SEO（`seo_ja` / `seo_en`）

`seo_title`、`seo_description`、`og_title`、`og_description`、`og_image_alt`、`canonical_url`、`noindex`、`exclude_from_sitemap`、`breadcrumb_label`。

## 記事画像

`insights.eyecatch_url` は `MEDIA_HOST` 上の https URL。ビルド時に Astro が取得し、配信 URL は `https://neolev.jp/...` にします。JSON-LD と `og:image` はその配信 URL を使います。

## 出さない項目

代表者名、電話、メール、料金、`offers`、Person。`corporate_number` は JSON-LD 以外に描画しません。
