// GitHub Projects (V2) の Issue 一覧をページネーション付きで全件取得する。
//
// 大量データを扱う際、取得件数の上限により一部がサイレントに欠落する事故を
// 防ぐため、`items.totalCount` と実際に取得した件数を必ず突き合わせ、
// 不一致があれば警告ではなく例外を投げて集計を止める。

const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const PAGE_SIZE = 50;

const QUERY = `
  query($org: String!, $number: Int!, $cursor: String, $pageSize: Int!) {
    organization(login: $org) {
      projectV2(number: $number) {
        title
        url
        items(first: $pageSize, after: $cursor) {
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field {
                    ... on ProjectV2FieldCommon { name }
                  }
                }
              }
            }
            content {
              ... on Issue {
                number
                title
                state
                url
                assignees(first: 10) {
                  nodes { login }
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function graphqlRequest(token, variables) {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: QUERY, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL リクエスト失敗: HTTP ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL エラー: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

/**
 * @param {object} opts
 * @param {string} opts.token - `project` (read:project で可) スコープを持つトークン
 * @param {string} opts.org - 対象 org のログイン名
 * @param {number} opts.number - Project の番号 (例: 1)
 * @returns {Promise<{ title: string, url: string, items: Array<object> }>}
 */
export async function fetchAllProjectItems({ token, org, number }) {
  if (!token) throw new Error("token が指定されていません");

  let cursor = null;
  let hasNextPage = true;
  let totalCount = null;
  let title = null;
  let url = null;
  const items = [];

  while (hasNextPage) {
    const data = await graphqlRequest(token, { org, number, cursor, pageSize: PAGE_SIZE });
    const projectV2 = data?.organization?.projectV2;
    if (!projectV2) {
      throw new Error(`Project が見つかりません: org=${org} number=${number}`);
    }

    title = projectV2.title;
    url = projectV2.url;
    totalCount = projectV2.items.totalCount;
    items.push(...projectV2.items.nodes);

    hasNextPage = projectV2.items.pageInfo.hasNextPage;
    cursor = projectV2.items.pageInfo.endCursor;
  }

  // 完全性チェック: 取得件数が totalCount と一致しない場合は集計せずに止める。
  if (items.length !== totalCount) {
    throw new Error(
      `取得件数が totalCount と一致しません（取得漏れの疑い）: fetched=${items.length} totalCount=${totalCount}`
    );
  }

  return { title, url, items };
}
