# 自動集計ダッシュボード PoC

itsuki-test-org の GitHub Project #1 の Issue/Status/Assignees を集計し、
静的 HTML/JSON を生成する。実行のたびに日次スナップショットを
`data/snapshots/` に蓄積し、Status別件数の推移をバーンアップチャートとして表示する。

## ローカル実行

```sh
GH_TOKEN=$(gh auth token) node scripts/dashboard/generate.js
```

`GH_TOKEN` には Projects 読み取り権限（`read:project` 以上）が必要。
出力先はデフォルトで `dist/`（`OUT_DIR` で変更可）。
スナップショット保存先はデフォルトで `data/snapshots/`（`SNAPSHOT_DIR` で変更可）。

## GitHub Actions

`.github/workflows/dashboard.yml` が `workflow_dispatch` に加えて
毎日 00:00 UTC の `schedule` トリガーでも起動し、
`生成 → スナップショットをコミット → Pages アップロード → デプロイ` を行う。

**要事前設定**: リポジトリ Secrets に `DASHBOARD_PROJECT_TOKEN`
（Projects 読み取り権限を持つ Personal Access Token）を登録すること。
デフォルトの `GITHUB_TOKEN` では org の Project へのアクセス権限が不足するため。

スナップショットのコミットには `contents: write` 権限を使う（ワークフローに設定済み）。

## スコープ外（次段階）

- 複数プロジェクトの統合ビュー
- カスタムフィールドによる区分別集計
