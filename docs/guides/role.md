---
title: Role Guide
description: Create a role, attach its policies one subject at a time, assign it to a new user, and check what the role may reach.
---

# Role Guide

This guide shows how to add a role with its own permissions, for a developer or an operator who needs an account type with narrower permissions than the seeded `admin`.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Authorization][ref-doc-concept-authorization]: role types, rank, and how policies become CASL abilities
- [Route Protection Guide][ref-doc-guide-route-protection]: put the role and policy decorators on a route
- [User][ref-doc-concept-user]: the account a role is assigned to
- [Seeded rows][ref-doc-reference-database-role]: the three roles and the admin policies a seed writes
- [Decorators and Guards Reference][ref-doc-reference-decorators-and-guards]: the role and policy guards
- [Status Codes][ref-doc-reference-status-codes-role]: the code and message of each exception named here

## Prerequisites

- A running API, seeded ([Seed Guide][ref-doc-guide-seed]), and the seeded default API key, sent as `<key>:<secret>` ([Seeded rows][ref-doc-reference-database-apikey]).
- An access token of an actor that outranks the role you create. Sign in as `superadmin@mail.com` with `POST /api/v1/public/user/login/credential`; its local password is in [Seeded rows][ref-doc-reference-database-user]. The seeded `superadmin` role (type `superAdmin`) outranks every type. An `admin` outranks only the `user` type, and a `user`-type role holds no policies.
- The actor's role holds the abilities the routes check. Every role and policy route checks the `role` subject: `read` and `create` to create a role or a policy, `read` and `update` to change one, and `read` and `delete` to delete one. Step 3 also needs `user: [read, create]`. The seeded `admin` and `superadmin` roles hold them.
- SES configured, because creating a user sends the account its temporary password. Without SES the user create answers `AwsSesNotConfiguredException` (501, `51407`) before any write ([Dependencies][ref-doc-concept-dependencies]).
- The subjects and actions the new role needs. The subjects are `all`, `apiKey`, `role`, `user`, `session`, `activityLog`, `passwordHistory`, `termPolicy`, `featureFlag`, `device`, `workspace`, `project`, and `analytic`. The actions are `manage`, `read`, `create`, `update`, and `delete`.

## Steps

1. Create the role. The name is 3 to 30 letters and digits and is lower-cased on input. The `type` is `admin` or `user`, never `superAdmin`, and `description` is optional on create:

    ```bash
    curl -s -X POST http://localhost:3000/api/v1/admin/role/create \
      -H 'x-api-key: <key>:<secret>' \
      -H 'authorization: Bearer <accessToken>' \
      -H 'content-type: application/json' \
      -d '{ "name": "contentmoderator", "description": "moderates user content", "type": "admin" }'
    ```

    The answer carries the role `id` in `data.id`.

2. Attach one policy per subject the role may reach. Each call takes one `subject` and its list of `action` values:

    ```bash
    curl -s -X POST http://localhost:3000/api/v1/admin/role/<roleId>/policy/create \
      -H 'x-api-key: <key>:<secret>' \
      -H 'authorization: Bearer <accessToken>' \
      -H 'content-type: application/json' \
      -d '{ "subject": "user", "action": ["read", "update"] }'
    ```

    - A role holds at most one policy per subject. A second policy for a covered subject answers `PolicyExistException` (409, `51102`). Change the actions of the existing policy with `PUT /api/v1/admin/role/<roleId>/policy/update/<policyId>`.
    - A policy on a `user`-type role answers `PolicyRoleTypeInvalidException` (400, `51104`).
    - Changing a role that holds a policy to the `user` type answers `RoleHasPoliciesException` (400, `50507`).

3. Assign the role when you create a user. The `roleId` is a field of the admin create request, and `countryId` is an `id` from `GET /api/v1/public/country/list` (sent with the key). An actor who does not outrank the role answers `RoleRankForbiddenException` (403, `50504`):

    ```bash
    curl -s -X POST http://localhost:3000/api/v1/admin/user/create \
      -H 'x-api-key: <key>:<secret>' \
      -H 'authorization: Bearer <accessToken>' \
      -H 'content-type: application/json' \
      -d '{ "email": "moderator@example.com", "username": "moderator", "roleId": "<roleId>", "countryId": "<countryId>" }'
    ```

    No route changes the role of an existing user.

4. Protect the routes the role should reach with the role type and the policy ([Route Protection Guide][ref-doc-guide-route-protection]). The new role takes effect on the next request, with no restart: `UserGuard` loads the user, its role, and its policies on every request.

## Check the result

1. List the policies of the role. The answer holds one entry per subject you attached:

    ```bash
    curl -s http://localhost:3000/api/v1/admin/role/<roleId>/policy/list \
      -H 'x-api-key: <key>:<secret>' \
      -H 'authorization: Bearer <accessToken>'
    ```

2. Sign in as the new user with the emailed temporary password, which lasts `auth.password.temporaryExpiresInMs` (3 days). The user has no acceptance row, so accept `termsOfService` and `privacy` through `POST /api/v1/shared/user/term-policy/accept` with `{ "type": ... }`, or every guarded route answers `51504`. Then call a route that checks an ability the role holds. It answers 200.
3. Call a route that checks an ability the role lacks. It answers `PolicyForbiddenException` (403, `51100`).
4. Call a route whose `@RoleProtected()` list omits the user's role type. It answers `RoleForbiddenException` (403, `50502`).
5. Delete the role while the user holds it. It answers `RoleUsedException` (409, `50503`).

The rank and self rules apply to every write on the role, its policies, and the user create: the actor must outrank the role type (`RoleRankForbiddenException`, 403, `50504`), and no actor edits the role they hold (`RoleSelfForbiddenException`, 403, `50505`). A seeded role cannot be deleted and its type cannot change (`RoleImmutableException`, 400, `50506`); its description and policies stay editable under the rank gates. No role's name changes after create.

## Related tasks

- [Route Protection Guide][ref-doc-guide-route-protection]: stack the guards on a route.
- [Seed Guide][ref-doc-guide-seed]: change the seeded roles and policies.

<!-- REFERENCES -->

[ref-doc-concept-authorization]: ../concepts/authorization.md
[ref-doc-concept-user]: ../concepts/user.md
[ref-doc-concept-dependencies]: ../concepts/dependencies.md#optional-adapters
[ref-doc-guide-route-protection]: route-protection.md
[ref-doc-guide-seed]: seed.md
[ref-doc-reference-database-apikey]: ../reference/database.md#apikey
[ref-doc-reference-database-user]: ../reference/database.md#user
[ref-doc-reference-database-role]: ../reference/database.md#role
[ref-doc-reference-decorators-and-guards]: ../reference/decorators-and-guards.md
[ref-doc-reference-status-codes-role]: ../reference/status-codes.md#role
