---
paths:
    - 'src/modules/activity-log/**'
    - 'src/languages/*/activityLog.json'
---

# Activity log

Recording an entry: `activity-entry.md`.

- Every `EnumActivityLogAction` member has a contract row and an `activityLog` i18n key.
- `ActivityLogRepository.createMany` writes only the rows whose id is absent, so a retried job inserts no duplicate.
