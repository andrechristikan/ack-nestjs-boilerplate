---
paths:
    - 'src/modules/activity-log/**'
    - 'src/languages/*/activityLog.json'
---

# Activity log

Recording an entry: `activity-entry.md`.

- Every `EnumActivityLogAction` member has a contract row and an `activityLog` i18n key.
- `ActivityLogRepository.createMany` writes only the rows whose id is absent, so a retried job inserts no duplicate.
- Every row stores the actor's request log; no row drops it. Both scopes respond through `ActivityLogResponseSchema`, whose `userAgent` is nullable. The shared scope maps its page through `ActivityLogUtil.toMaskedList`: every entry has `apiKeyId` null, an entry the reader created stays whole otherwise, and an entry another actor created has `ipAddress`, `userAgent`, `geoLocation`, and `createdBy` null too and no `metadata.actorUserId`. The admin scope returns every field.
- The admin scope also lists the entries of one API key, a deleted key's included; an id no key holds answers an empty list.
- The `activityLog` queue's daily `purgeExpired` (`queue.md`, Enqueuing) deletes a row older than `activityLog.retentionInMs`; the retention stays no shorter than `analytic.maxWindowInMs`.
