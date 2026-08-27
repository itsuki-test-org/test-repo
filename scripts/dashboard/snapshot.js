// バーンアップチャート用の日次スナップショットを管理する。
// 保存先はリポジトリ内のディレクトリ (デフォルト data/snapshots/) で、
// 1日1ファイル (YYYY-MM-DD.json) として蓄積する。同日に複数回実行された
// 場合は上書きする（1日1点のみを残す）。

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

function toDateString(isoString) {
  return isoString.slice(0, 10); // "2026-08-27T08:19:39.903Z" -> "2026-08-27"
}

/**
 * @param {object} params
 * @param {string} params.snapshotDir
 * @param {string} params.generatedAt - ISO8601 文字列
 * @param {Record<string, number>} params.byStatus
 */
export async function writeSnapshot({ snapshotDir, generatedAt, byStatus }) {
  const date = toDateString(generatedAt);
  await mkdir(snapshotDir, { recursive: true });
  await writeFile(
    path.join(snapshotDir, `${date}.json`),
    JSON.stringify({ date, byStatus }, null, 2) + "\n",
    "utf8"
  );
  return date;
}

/**
 * @param {string} snapshotDir
 * @returns {Promise<Array<{ date: string, byStatus: Record<string, number> }>>} 日付昇順
 */
export async function readSnapshots(snapshotDir) {
  let files;
  try {
    files = await readdir(snapshotDir);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }

  const snapshots = await Promise.all(
    files
      .filter((name) => name.endsWith(".json"))
      .map(async (name) => JSON.parse(await readFile(path.join(snapshotDir, name), "utf8")))
  );

  return snapshots.sort((a, b) => a.date.localeCompare(b.date));
}
