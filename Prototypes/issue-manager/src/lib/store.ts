export {
  getAllIssues,
  getAllIssuesLocal,
  getIssue,
  updateIssue,
  countBy,
  topValues,
  topValuesFromIssues,
  findSimilar,
  findSimilarByText,
  detectPatterns,
  detectPatternsFromIssues,
  getTotalCount,
  getDistinctAreas,
  insertIssue,
  bulkInsert,
  issueExistsByHash,
  issueExistsByHashLocal,
  computeDedupHash,
  getGroupSummaries,
  acknowledgeGroup,
  getIssueGroup,
  getAllIssueGroups,
  mergeIssueLists,
} from "./db";

export type { PatternCluster, GroupSummary } from "./db";
export type { IssueGroup } from "./types";
