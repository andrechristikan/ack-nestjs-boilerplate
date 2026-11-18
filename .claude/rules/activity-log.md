---
paths:
    - 'src/modules/activity-log/**'
    - 'src/languages/*/activityLog.json'
---

# Activity log

Recording an entry: `activity-entry.md`.

- Every `EnumActivityLogAction` member has a contract row and an `activityLog` i18n key.
- `ActivityLogRepository.createMany` writes only the rows whose id is absent, so a retried job inserts no duplicate.
- Every row stores the actor's request log; no row drops it. The shared scope responds through `ActivityLogSharedResponseSchema`: `ActivityLogUtil.toSharedView` returns an entry the reader created whole, and an entry another actor created with `ipAddress`, `userAgent`, `geoLocation`, and `createdBy` null and no `metadata.actorUserId`. The admin scope returns every field.
