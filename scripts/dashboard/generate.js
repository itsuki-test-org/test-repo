// エントリポイント: 取得 → 集計 → 出力 を通しで実行する。
//
// 環境変数:
//   GH_TOKEN       - Projects 読み取り権限 (read:project 以上) を持つトークン (必須)
//   DASHBOARD_ORG  - 対象 org のログイン名 (デフォルト: itsuki-test-org)
//   DASHBOARD_PROJECT_NUMBER - 対象 Project の番号 (デフォルト: 1)
//   OUT_DIR        - 出力先ディレクトリ (デフォルト: dist)

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchAllProjectItems } from "./fetch-project-items.js";
import { aggregate } from "./aggregate.js";
import { renderHtml } from "./render.js";

async function main() {
  const token = process.env.GH_TOKEN;
  const org = process.env.DASHBOARD_ORG ?? "itsuki-test-org";
  const number = Number(process.env.DASHBOARD_PROJECT_NUMBER ?? "1");
  const outDir = process.env.OUT_DIR ?? "dist";

  if (!token) {
    throw new Error("環境変数 GH_TOKEN が未設定です（Projects読み取り権限を持つトークンが必要）");
  }

  const { title, url, items } = await fetchAllProjectItems({ token, org, number });
  const summary = aggregate(items);
  const generatedAt = new Date().toISOString();

  const html = renderHtml({ projectTitle: title, projectUrl: url, summary, generatedAt });

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "index.html"), html, "utf8");
  await writeFile(
    path.join(outDir, "data.json"),
    JSON.stringify({ projectTitle: title, projectUrl: url, generatedAt, summary }, null, 2),
    "utf8"
  );

  console.log(`生成完了: ${outDir}/index.html, ${outDir}/data.json`);
  console.log(`集計対象: ${summary.totalCount}件（除外: ${summary.droppedCount}件）`);
  console.log("Status別:", summary.byStatus);
  console.log("担当者別:", summary.byAssignee);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
