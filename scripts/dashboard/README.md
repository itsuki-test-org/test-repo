# 自動集計ダッシュボード PoC

itsuki-test-org の GitHub Project #1 の Issue/Status/Assignees を集計し、静的 HTML/JSON を生成する。

方針の詳細は `quoligate-ai-actions` ワークスペースの
`01_内部資料/自動集計ダッシュボードPoC/00_方針.md` を参照。

## ローカル実行

```sh
GH_TOKEN=$(gh auth token) node scripts/dashboard/generate.js
```

`GH_TOKEN` には Projects 読み取り権限（`read:project` 以上）が必要。
出力先はデフォルトで `dist/`（`OUT_DIR` で変更可）。

## GitHub Actions

`.github/workflows/dashboard.yml` が `workflow_dispatch` で起動し、
`生成 → Pages アップロード → デプロイ` を行う。

**要事前設定**: リポジトリ Secrets に `DASHBOARD_PROJECT_TOKEN`
（Projects 読み取り権限を持つ Personal Access Token）を登録すること。
デフォルトの `GITHUB_TOKEN` では org の Project へのアクセス権限が不足するため。

## スコープ外（次段階）

- バーンアップ等の時系列推移（日次スナップショットの蓄積が前提）
- 複数プロジェクトの統合ビュー
- カスタムフィールド（Detection process 等）による区分別集計
