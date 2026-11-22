---
paths:
    - 'src/modules/role/**'
    - 'src/modules/policy/**'
    - 'src/modules/term-policy/**'
    - 'src/modules/user/services/**'
    - 'src/modules/user/use-cases/**'
---

# Roles, policies, and term policies

- CASL abilities come from the caller's role's `Policy` rows; `@PolicyProtected` names subject and actions.
- Role rank is `superAdmin > admin > user` (`EnumRoleType`). An admin-facing write on a role, its policies, or a user (create, status, password reset, MFA reset, session revoke, device removal) refuses a target ranked at or above the actor, except a superAdmin actor on a superAdmin target. No actor edits the role they hold or its policies. A role request DTO's `type` is `admin` or `user`.
- Policies belong to admin-type roles: a policy create or update on a `user`-type role, and a role type change to `user` while it holds a policy, are refused, while a delete stays allowed; `RoleGuard` stores no policy for a `user` or `superAdmin` role.
- `RoleCache` holds a role with its policies; the guard reads the user row uncached.
- A role with `isImmutable` true cannot be deleted and its `type` cannot change, whoever the actor is. Its `description` and policies stay editable under the rank gates. The role seed alone sets the field, true on `superadmin`, `admin`, and `user`; no request DTO, `IRoleCreate`, or `IRoleUpdate` carries it. `user.default.role` names the sign-up role, one of those immutable roles.
- The term-policy guard compares the user's `TermPolicyUserAcceptance` rows with the latest published policy per required type; a type with no published version needs no acceptance and makes sign-up throw a term-policy exception. Publishing a version archives every earlier published one of its type; readers take the latest published row per type. No per-user acceptance flag, no reset on publish.
- A publish copies the draft's content to the public bucket (`AWSS3Service.copyItems`) before its transaction, and a failed copy leaves the draft a draft: no job copies content, and no status sits between `draft` and `published`. The `termPolicy` queue carries `deleteContent` and `publish`.
- Each term-policy upload has its own key (`TermPolicyUtil.getContentKey`). Deleting a draft, or replacing or removing one of its languages, deletes the keys it held through `deleteContent`, never a directory.
