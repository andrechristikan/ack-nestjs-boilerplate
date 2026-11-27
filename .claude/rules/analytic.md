---
paths:
    - 'src/modules/analytic/**'
---

# Analytic results

Every result is on request or generated. An endpoint answers a question an operator acts on, never one activity-log action alone.

A metric carries one name in its route, enum member, i18n key, service read, and use case, its area singular: `/user/churn`, `userChurn`, `getUserChurn`, `AnalyticUserChurnUseCase`. A paged read adds `List` to its route (`/list`), i18n key, service read, and use case; its enum member names the metric alone (`workspaceActivityVolume` serves `getWorkspaceActivityVolumeList`).

## One statement

- One computation is one statement: a builder statement when it computes the whole result, otherwise one `aggregateRaw` pipeline. Never ids then details, a query per row or chunk, a cursor loop to the end, or rows grouped, sorted, or scored in the process.
- The kit's offset pair (`count` plus `findMany`) is paging. A pipeline list pages in `$facet { data: [$sort, $skip, $limit], total: [$count] }` and returns `PaginationOffsetUtil.page`.
- A pipeline's stages sit in the repository method that runs it. Stages two pipelines of one repository share sit in a private method returning `Prisma.InputJsonValue[]`; stages two repositories share sit in `AnalyticPipelineUtil`.
- A `Date` enters a pipeline through `AnalyticPipelineUtil.toDate`, an id through `AnalyticPipelineUtil.toObjectId`, a list's `$sort` through `AnalyticPipelineUtil.sortStage`.
- The repository method parses the result with `Analytic<Computation>PipelineSchema` (`dtos/analytic.<computation>-pipeline.dto.ts`) into its `I*` return shape; a parse failure throws `AppUnknownException`.
- Its service reads every window, threshold, weight, band, and `app.timezone` in its constructor and passes them as arguments. The service, not the use case, owns a configured window.
- A repository and its pipelines are no unit subject (`testing.md`): a boot calls every analytic route against seeded data.

## On request or generated

- On request: a statement whose match an index bounds to a short window or to rare events, a count or group over one collection an index serves, answered whole or bounded by a window (its live parent read by `$lookup` included), or a join from a parent set a filter bounds that only counts the rows an indexed lookup key matches; a paged group list over the client's date range reads each page through `CacheService.readThrough`, keyed by `analytic.cache.dashboardPageKeyPattern` with `analytic.cache.dashboardTtlInMs` (`AnalyticWorkspaceService.getWorkspaceActivityVolumeList`), every other paged list runs uncached, and every summary, count, or group is read through `CacheService.readThrough`, the workspace-scoped `getInviteFunnel`, `getJoinOutcomes`, and `getMemberRoles` included, keyed per workspace.
- Generated: a pipeline over a whole live population that joins, windows, or buckets per user and groups or sorts by a per-user value, that groups a whole collection with no bounding window and sorts and pages the groups, or that joins per row of that population. The `analytic` queue's refresh job computes it into `AnalyticSnapshot` and `AnalyticSnapshotItem`; never computed in the request.
- A generated route reads the snapshot from MongoDB with no cache in front, takes no window or date range from the client (its window is the configured one), and answers `computedAt`: before the first run a summary or one-item read carries `null`, and a list's metadata omits the key (`null-safety.md`).
- An on-request signal whose window is fixed in config takes no window from the client; its summary answers `windowStart`, `windowEnd`, and `computedAt: null`.
- A snapshot is one header per signal and one `AnalyticSnapshotItem` per item under the run's `runId`; a reader reads the header and its run's items in one pipeline (`$lookup` on the signal and `runId`). No transaction spans a run, and no document holds a whole item list. A signal whose result is a fixed set of named values writes no item and carries it in the header's `metadata`.
- A new generated signal adds its `EnumAnalyticSnapshotSignal` member, its compute method, and its case in `AnalyticProcessRefreshSnapshotUseCase`.
