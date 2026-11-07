# 0021. Admin import is a job, export is not

- Status: accepted
- Date: 2026-11-07

## Context

Admin import creates users in one bulk transaction. Admin export returns a file.

## Decision

`POST /admin/user/import` validates the file, writes one `user.importByAdmin` outbox effect, and answers 200 `{ metadata: { outboxId } }`. The job creates the users and sends `userImportResult`, an email to the acting admin with counts and collision reasons.

## Considered options

- import answers with an `outboxId` and notifies the admin with `userImportResult` (chosen)
- synchronous import: rejected, hashing up to fifty passwords and one bulk transaction would hold the request open.
- asynchronous export: rejected, the response is the file.

## Consequences

A 200 from the import does not mean the users exist.
