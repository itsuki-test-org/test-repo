// Project Item の生データから集計する。集計はここでプログラムとして行い、
// AI には数えさせない（プロジェクト共通方針）。

const UNASSIGNED_LABEL = "未アサイン";

function getFieldValue(item, fieldName) {
  const match = item.fieldValues.nodes.find((fv) => fv?.field?.name === fieldName);
  return match?.name ?? null;
}

function getAssigneeLogins(item) {
  const logins = item.content?.assignees?.nodes?.map((a) => a.login) ?? [];
  return logins.length > 0 ? logins : [UNASSIGNED_LABEL];
}

function countBy(entries) {
  const counts = {};
  for (const key of entries) {
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/**
 * @param {Array<object>} items - fetchAllProjectItems() が返す items
 * @returns {{
 *   totalCount: number,
 *   byStatus: Record<string, number>,
 *   byAssignee: Record<string, number>,
 *   items: Array<{ number: number, title: string, url: string, status: string|null, assignees: string[] }>
 * }}
 */
export function aggregate(items) {
  // content が null になるのは、Issue が削除された等で Project Item だけ残っているケース。
  // 集計対象からは除外しつつ、除外件数はサイレントにせず数える。
  const withContent = items.filter((item) => item.content != null);
  const droppedCount = items.length - withContent.length;

  const statuses = withContent.map((item) => getFieldValue(item, "Status") ?? "未設定");
  const assignees = withContent.flatMap((item) => getAssigneeLogins(item));

  return {
    totalCount: withContent.length,
    droppedCount,
    byStatus: countBy(statuses),
    byAssignee: countBy(assignees),
    items: withContent.map((item) => ({
      number: item.content.number,
      title: item.content.title,
      url: item.content.url,
      status: getFieldValue(item, "Status"),
      assignees: getAssigneeLogins(item),
    })),
  };
}
