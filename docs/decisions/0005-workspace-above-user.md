# 0005. Workspace above user

- Status: accepted
- Date: 2026-11-07

## Context

User flows call workspace and project services 19 times (sign-up, the self-delete cascade, the last-workspace lookup at login). Workspace services call the user service 13 times (lookups by email or id, `lastWorkspaceId` writes). Every other edge between features points one way.

## Decision

`WorkspaceService` may inject `UserService` for lookups by email or id and for `lastWorkspaceId` writes. Every user-side call into workspace or project (sign-up, the self-delete cascade, the last-workspace lookup at login) is a user use case.

## Considered options

- `WorkspaceService` may inject `UserService`, user calls into workspace are use cases (chosen)
- user above workspace: rejected, workspace services need user lookups and `lastWorkspaceId` writes as rules, while the user-side calls into workspace are orchestration that fits a use case.

## Consequences

No service edge points from user to workspace.
