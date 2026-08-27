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

/**
 * @param {object} params
 * @param {string} params.projectTitle
 * @param {string} params.projectUrl
 * @param {ReturnType<import("./aggregate.js").aggregate>} params.summary
 * @param {string} params.generatedAt - ISO8601 文字列
 */
export function renderHtml({ projectTitle, projectUrl, summary, generatedAt }) {
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
