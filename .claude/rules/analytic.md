---
paths:
    - 'src/modules/analytic/**'
---

# Analytic results

Every analytic read lives in `src/modules/analytic/`. Every result is on request or generated.

## One statement

- One computation is one statement: a builder statement when it computes the whole result, otherwise one `aggregateRaw` pipeline. Never ids then details, a query per row or chunk, a cursor loop to the end, or rows grouped, sorted, or scored in the process.
- The kit's offset pair (`count` plus `findMany`) is paging. A pipeline list pages in `$facet { data: [$sort, $skip, $limit], total: [$count] }` and returns `PaginationOffsetUtil.page`.
- A pipeline's stages sit in the repository method that runs it. Stages two pipelines of one repository share sit in a private method returning `Prisma.InputJsonValue[]`; stages two repositories share sit in `AnalyticPipelineUtil`.
- A `Date` enters a pipeline through `AnalyticPipelineUtil.toDate`, an id through `toObjectId`, a list's `$sort` through `sortStage`.
- The repository method parses the result with `Analytic<Computation>PipelineSchema` (`analytic.constant.ts`) into its `I*` return shape; a parse failure throws `AppUnknownException`.
- An analytic repository injects no `ConfigService`: its service reads every window, threshold, weight, band, and `app.timezone` in its constructor and passes them as arguments. The service, not the use case, owns a configured window.
- A repository and its pipelines are no unit subject (`testing.md`): a boot calls every analytic route against seeded data.

## On request or generated

- On request: a statement whose match an index bounds to a short window or to rare events, a count or group over one collection an index serves (its live parent read by `$lookup` included), or a join that only counts the rows an indexed lookup key matches; read through `CacheService.readThrough`.
- Generated: a pipeline that joins, windows, or buckets per user over a whole live population and groups or sorts by a per-user value. The `analytic` queue's refresh job computes it into `AnalyticSnapshot` and `AnalyticSnapshotItem`; never computed in the request.
- A generated route reads the snapshot from MongoDB with no cache in front, takes no window or date range from the client (its window is the configured one), and answers `computedAt`: before the first run a summary or one-item read carries `null`, and a list's metadata omits the key (`null-safety.md`).
- An on-request signal whose window is fixed in config takes no window from the client; its summary answers `windowStart`, `windowEnd`, and `computedAt: null`.
- A snapshot is one header per signal and one `AnalyticSnapshotItem` per item under the run's `runId`; a reader resolves the header, then reads that `runId`'s items. No transaction spans a run, and no document holds a whole item list.
- A new generated signal adds its `EnumAnalyticSnapshotSignal` member, its compute method, and its case in `AnalyticProcessRefreshSnapshotUseCase`.
