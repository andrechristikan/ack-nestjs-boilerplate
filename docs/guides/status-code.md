---
title: Status Code Guide
description: Allocate a status code, write the typed exception, add its message in every language, and throw it from a service.
---

# Status Code Guide

This guide shows how to add a typed error to a module, for a developer whose flow needs a failure with its own code and message.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Error Handling][ref-doc-concept-error-handling]: how an exception becomes a response
- [Status Codes][ref-doc-reference-status-codes]: every block and member
- [I18n][ref-doc-concept-i18n]: how the message path resolves
- [I18n Guide][ref-doc-guide-i18n]: the message files in detail
- [Dependencies][ref-doc-dependencies]: the unavailable and not-configured exceptions that already exist

## Prerequisites

- The failure is a request failure with its own meaning. A failure that no client acts on takes an existing member.
- The module that owns the failed subject. A missing workspace is a `workspace` exception wherever the check runs, and no other module allocates a code for it.
- A checkout where `pnpm typecheck` passes.

## Steps

1. Scan the registry before you allocate. The enum files are the source of every code, and the command prints the lowest and highest member of each owner:

    ```bash
    find src -name '*.status-code.enum.ts' | sort | while read -r f; do
      echo "== $f"
      grep -oE '= [0-9]+' "$f" | tr -d '= ' | sort -n | sed -n '1p;$p'
    done
    ```

2. Look for a member that already means what you need in the enum of the owner, and reuse it. Add a member only when nothing fits.
3. Name the failure by its descriptor. The descriptor is kebab-case in the exception file name (`role.has-policies.exception.ts`) and camelCase in the enum member (`hasPolicies`) and in the message key (`role.error.hasPolicies`). Add the member at the end of the owner's block, at the next number, with no gap (`src/modules/role/enums/role.status-code.enum.ts`):

    ```typescript
    export enum EnumRoleStatusCodeError {
        notFound = 50500,
        /* members up to immutable follow */
        hasPolicies = 50507,
    }
    ```

    - A block holds a hundred codes, so check that the next number stays inside it. When it does not, the block is full and takes no member: reuse a member that fits, or raise it with the maintainers, because an owner holds one block only.
    - A module with no enum yet takes the lowest free hundred from `50000` up, one that no owner's range from the step 1 scan touches, and creates `src/modules/<module>/enums/<module>.status-code.enum.ts` with its first member at the base. Today that is `51800`.

4. Create `src/modules/<module>/exceptions/<module>.<descriptor>.exception.ts` with one class that extends `AppBaseException`. The `module` field is the module name in camelCase, so `api-key` is `apiKey`. The `statusCodeKey` is the reverse lookup of the same member (`src/modules/role/exceptions/role.has-policies.exception.ts`):

    ```typescript
    export class RoleHasPoliciesException extends AppBaseException {
        readonly module = 'role';
        readonly statusCode = EnumRoleStatusCodeError.hasPolicies;
        readonly statusCodeKey = EnumRoleStatusCodeError[this.statusCode];
        readonly httpStatus = HttpStatus.BAD_REQUEST;

        constructor() {
            super('role.error.hasPolicies');
        }
    }
    ```

5. Choose the `httpStatus`. A new exception takes a 4xx from this list, which is the use the existing exceptions follow:
    - 400 for a request the server understood that breaks a business rule or conflicts with the subject's state, such as a role that still holds policies.
    - 401 for an identity that is missing, invalid, or expired.
    - 403 for a caller who is known and not allowed.
    - 404 for a subject that does not exist.
    - 409 for a request that collides with existing data, such as a name that is already taken.
    - 422 for request validation, pagination, and file refusals. Only the request, pagination, and file kits use it.
    - 500, 501, and 503 already have owners, so no new feature exception takes them. 500 is `AppUnknownException` and the bugs the code detects, 503 is the unavailable exception of a kit, and 501 is the not-configured exception of an optional integration ([Dependencies][ref-doc-dependencies]).
6. Add the message under `error.<descriptor>` in `src/languages/<language>/<module>.json`, in every language directory. The file name is the module name in camelCase, so `term-policy` is `termPolicy.json`, and a module with no language file yet gets a new one holding `{ "error": { ... } }`. The path in `super(...)` is `<module>.error.<descriptor>`. A generic transport failure reuses an `http.*` path.
7. For a message with a placeholder, take named constructor parameters and map them to `messageProperties`. The `{period}` of the message `New password must be different from previous passwords within the past {period} days.` is filled this way (`src/modules/password-history/exceptions/password-history.must-new.exception.ts`):

    ```typescript
    constructor(readonly period: number) {
        super('passwordHistory.error.mustNew', {
            messageProperties: { period },
        });
    }
    ```

8. Throw the exception where the check runs: `throw new RoleHasPoliciesException();`. The exception belongs to the subject that failed, so a service or a use case of another module that finds a missing workspace throws `WorkspaceNotFoundException` and allocates no code of its own. Throw a typed exception only, never a Nest `HttpException` or an `Error`. When a `catch` wraps another error, throw `new AppUnknownException(error)` so the cause rides in `rawError`.
9. Add a unit spec in `test/unit/modules/<module>/exceptions/<module>.<descriptor>.exception.spec.ts`. It asserts that the exception extends `AppBaseException` and carries the `module`, `statusCode`, `statusCodeKey`, `httpStatus`, and `messagePath` (`test/unit/modules/role/exceptions/role.has-policies.exception.spec.ts`).
10. Add the member to the module table of [Status Codes][ref-doc-reference-status-codes].
11. To remove a member, delete the enum member and its exception, renumber the later members so the block stays contiguous, and remove the message key from every language file. The integer is client-visible, so the renumber changes what a client reads.

## Check the result

1. Run the typecheck and the unit specs of the module:

    ```bash
    pnpm typecheck
    pnpm test <module>
    ```

2. Check that no class writes a literal code. This search prints nothing:

    ```bash
    grep -rn 'statusCode = [0-9]' src/
    ```

3. Search for the descriptor and confirm it appears in the enum, the exception, and every language directory:

    ```bash
    grep -rn '<descriptor>' src/modules/<module>/ src/languages/
    ```

4. Trigger the failure on a running API and read the error envelope: `statusCode`, `statusCodeKey`, `module`, and the localized `message` match the new member.

## Related tasks

- [I18n Guide][ref-doc-guide-i18n]: add the message and a language.
- [Schema Guide][ref-doc-guide-schema]: write the request schema whose failure the route reports.
- [API Documentation Guide][ref-doc-guide-api-documentation]: publish the error of a new guard decorator.

<!-- REFERENCES -->

[ref-doc-concept-error-handling]: ../concepts/error-handling.md
[ref-doc-reference-status-codes]: ../reference/status-codes.md
[ref-doc-concept-i18n]: ../concepts/i18n.md
[ref-doc-guide-i18n]: i18n.md
[ref-doc-guide-schema]: schema.md
[ref-doc-guide-api-documentation]: api-documentation.md
[ref-doc-dependencies]: ../concepts/dependencies.md
