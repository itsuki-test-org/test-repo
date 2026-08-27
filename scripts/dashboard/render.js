// 集計結果 (aggregate.js の出力) から静的 HTML を組み立てる。
// 見た目は最小限。PoC の目的は「Actions → 集計 → Pages」の一連の流れを動かすこと。

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderCountTable(counts, headLabel) {
  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `<tr><td>${escapeHtml(key)}</td><td>${count}</td></tr>`)
    .join("\n");
  return `
    <table>
      <thead><tr><th>${escapeHtml(headLabel)}</th><th>件数</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderItemList(items) {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td><a href="${escapeHtml(item.url)}">#${item.number}</a></td>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.status ?? "未設定")}</td>
        <td>${escapeHtml(item.assignees.join(", "))}</td>
      </tr>`
    )
    .join("\n");
  return `
    <table>
      <thead><tr><th>Issue</th><th>Title</th><th>Status</th><th>Assignees</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// バーンアップチャート描画で優先的に使う Status の並び順。
// ここに無い Status（未設定のカスタムStatus等）は末尾に追加する。
const STATUS_ORDER = ["Todo", "In Progress", "Done"];
const STATUS_COLOR = {
  Todo: "#868e96",
  "In Progress": "#e8890c",
  Done: "#2f9e44",
};
const FALLBACK_COLORS = ["#5c7cfa", "#ae3ec9", "#f03e3e"];

function collectStatusKeys(snapshots) {
  const seen = new Set();
  for (const snap of snapshots) {
    for (const key of Object.keys(snap.byStatus)) seen.add(key);
  }
  const ordered = STATUS_ORDER.filter((key) => seen.has(key));
  const rest = [...seen].filter((key) => !STATUS_ORDER.includes(key)).sort();
  return [...ordered, ...rest];
}

function colorFor(key, index) {
  return STATUS_COLOR[key] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

/**
 * 日次スナップショットの配列から、Status別の推移を表す折れ線グラフをSVGで描く。
 * 外部ライブラリには依存しない（既存 render.js の方針を踏襲）。
 *
 * @param {Array<{ date: string, byStatus: Record<string, number> }>} snapshots - 日付昇順
 */
function renderBurnupChart(snapshots) {
  if (snapshots.length < 2) {
    return `<p class="meta">スナップショットが${snapshots.length}件のみのため、推移グラフは表示できません（2件以上たまると表示されます）。</p>`;
  }

  const statusKeys = collectStatusKeys(snapshots);
  const width = 640;
  const height = 260;
  const padding = { top: 16, right: 16, bottom: 32, left: 40 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxCount = Math.max(
    1,
    ...snapshots.flatMap((snap) => statusKeys.map((key) => snap.byStatus[key] ?? 0))
  );

  const xAt = (i) => padding.left + (snapshots.length === 1 ? 0 : (i / (snapshots.length - 1)) * plotWidth);
  const yAt = (count) => padding.top + plotHeight - (count / maxCount) * plotHeight;

  const lines = statusKeys
    .map((key, idx) => {
      const points = snapshots.map((snap, i) => `${xAt(i).toFixed(1)},${yAt(snap.byStatus[key] ?? 0).toFixed(1)}`).join(" ");
      return `<polyline points="${points}" fill="none" stroke="${colorFor(key, idx)}" stroke-width="2" />`;
    })
    .join("\n");

  const legend = statusKeys
    .map(
      (key, idx) => `
      <span style="display:inline-flex;align-items:center;gap:0.3rem;margin-right:1rem;">
        <span style="width:0.7rem;height:0.7rem;background:${colorFor(key, idx)};display:inline-block;border-radius:2px;"></span>
        ${escapeHtml(key)}
      </span>`
    )
    .join("");

  const firstLabel = escapeHtml(snapshots[0].date);
  const lastLabel = escapeHtml(snapshots[snapshots.length - 1].date);

  return `
    <div>${legend}</div>
    <svg viewBox="0 0 ${width} ${height}" width="100%" style="max-width: ${width}px; height: auto;">
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotHeight}" stroke="#ccc" />
      <line x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${padding.left + plotWidth}" y2="${padding.top + plotHeight}" stroke="#ccc" />
      <text x="4" y="${padding.top + 4}" font-size="11" fill="#666">${maxCount}</text>
      <text x="4" y="${padding.top + plotHeight}" font-size="11" fill="#666">0</text>
      <text x="${padding.left}" y="${height - 6}" font-size="11" fill="#666">${firstLabel}</text>
      <text x="${padding.left + plotWidth}" y="${height - 6}" font-size="11" fill="#666" text-anchor="end">${lastLabel}</text>
      ${lines}
    </svg>`;
}

/**
 * @param {object} params
 * @param {string} params.projectTitle
 * @param {string} params.projectUrl
 * @param {ReturnType<import("./aggregate.js").aggregate>} params.summary
 * @param {string} params.generatedAt - ISO8601 文字列
 * @param {Array<{ date: string, byStatus: Record<string, number> }>} [params.snapshots] - 日付昇順。省略時は推移グラフを表示しない
 */
export function renderHtml({ projectTitle, projectUrl, summary, generatedAt, snapshots = [] }) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>自動集計ダッシュボードPoC</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #1a1a1a; }
  h1 { font-size: 1.4rem; }
  h2 { font-size: 1.1rem; margin-top: 2rem; }
  table { border-collapse: collapse; margin-top: 0.5rem; width: 100%; max-width: 720px; }
  th, td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: left; font-size: 0.9rem; }
  th { background: #f2f2f2; }
  .meta { color: #666; font-size: 0.85rem; }
  .warn { color: #b02a00; }
</style>
</head>
<body>
  <h1>自動集計ダッシュボードPoC</h1>
  <p class="meta">
    対象: <a href="${escapeHtml(projectUrl)}">${escapeHtml(projectTitle)}</a><br>
    生成日時: ${escapeHtml(generatedAt)}<br>
    集計対象件数: ${summary.totalCount}件
    ${summary.droppedCount > 0 ? `<span class="warn">（content欠落のため除外: ${summary.droppedCount}件）</span>` : ""}
  </p>

  <h2>Status別件数の推移（バーンアップ）</h2>
  ${renderBurnupChart(snapshots)}

  <h2>Status別件数</h2>
  ${renderCountTable(summary.byStatus, "Status")}

  <h2>担当者別件数</h2>
  ${renderCountTable(summary.byAssignee, "Assignee")}

  <h2>Issue一覧</h2>
  ${renderItemList(summary.items)}
</body>
</html>
`;
}
