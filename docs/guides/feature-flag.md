---
title: Feature Flag Guide
description: Gate a route behind a feature flag, read a sub-key in a service, and add a new flag or sub-key.
---

# Feature Flag Guide

This guide shows how to gate a route or a sub-feature behind a flag and how to add a flag, for a developer who knows how a flag is evaluated.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Feature Flag][ref-doc-concept-feature-flag]: how a flag is evaluated, targeted, rolled out, and cached
- [Feature Flag Reference][ref-doc-reference-feature-flag]: every seeded flag, its sub-keys, and the update rules
- [Route Protection Guide][ref-doc-guide-route-protection]: where the flag decorator sits in the stack
- [Seed Guide][ref-doc-guide-seed]: run a seed command
- [Status Code Guide][ref-doc-guide-status-code]: the exceptions a gated route answers

## Prerequisites

- The flag exists in `src/migration/data/migration.feature-flag.data.ts` and as a member of `EnumFeatureFlagKey` in `src/modules/feature-flag/enums/feature-flag.enum.ts`, or you add it first in [Add a flag](#add-a-flag). A route whose key has no seeded row answers `FeatureFlagNotConfiguredException` (500).
- A flag decides whether a feature is on. It never decides who may use it: authorization stays on the role, policy, and workspace guards.

## Steps

### Gate a route

1. Add `@FeatureFlagProtected(EnumFeatureFlagKey.<member>)` below `@UserProtected()` and above `@RequestThrottleProtected` and `@AuthJwtAccessProtected()`. Decorators run bottom-up: the API key guard runs first, then the JWT guard, which writes the actor id the flag guard reads, so the flag guard sees the signed-in user, and a disabled feature answers before the user guard loads the user. The full order is in the [Decorators and Guards Reference][ref-doc-reference-decorators-and-guards-order]. Import `FeatureFlagProtected` from `@modules/feature-flag/decorators/feature-flag.decorator` and `EnumFeatureFlagKey` from `@modules/feature-flag/enums/feature-flag.enum`. This is the workspace list in `src/modules/workspace/controllers/workspace.user.controller.ts`:

    ```typescript
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    ```

2. On a public route, which has no JWT, keep `@FeatureFlagProtected` directly above `@RequestThrottleProtected({ route })` and `@ApiKeyProtected()`, as the sign-up route does. The guard treats the caller as anonymous. Below a rollout of 100 the client sends an `x-anonymous-id` header of ASCII letters, digits, `-`, and `_`, at most `featureFlag.anonymous.idMaxLength` characters ([Configuration Reference][ref-doc-reference-configuration-feature-flag]), and the same value always lands in the same bucket.
3. Pass one `EnumFeatureFlagKey` member. An enum value that is empty or holds a dot fails the boot (`FeatureFlagKeyEmptyException`, `FeatureFlagKeyNestedException`).

### Read a sub-key

1. Read the sub-key in the service that owns the behavior, before the use case opens its transaction. Inject `FeatureFlagService` from `@modules/feature-flag/services/feature-flag.service`: `FeatureFlagModule` is global, so the module file imports nothing.
2. For an on/off switch, call `validateFeatureFlagMetadata`. It throws `FeatureFlagDisabledException` (404) unless the flag is enabled and the sub-key is `true`. Await it beside the service's own read in one `Promise.all`. This is the forgot-password gate in `src/modules/user/services/user.password.service.ts`:

    ```typescript
    const [user] = await Promise.all([
        this.userRepository.findOneActiveByEmail(email),
        this.featureFlagService.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.changePassword,
            EnumFeatureFlagMetadataKey.forgotAllowed
        ),
    ]);
    ```

3. For a boolean answer without an exception, call `isMetadataAllowed`. For a number, call `getMetadataNumber`. The three methods are async and take `(key, metadataKey)`: `validateFeatureFlagMetadata` returns `Promise<void>`, `isMetadataAllowed` `Promise<boolean>`, and `getMetadataNumber` `Promise<number>`. None reads rollout or targeting. `validateFeatureFlagMetadata` and `isMetadataAllowed` need `isEnable` true and the sub-key `true`, and `getMetadataNumber` returns the stored value whatever `isEnable` says.
4. Name the sub-key with an `EnumFeatureFlagMetadataKey` member, never with a string. Both enums are exported from `@modules/feature-flag/enums/feature-flag.enum`.

### Add a flag

1. Add the key to `EnumFeatureFlagKey`.
2. Add a row to `FeatureFlagData` in `src/migration/data/migration.feature-flag.data.ts` with the `key`, a `description`, `isEnable`, `rolloutPercent`, and flat `metadata` when the flag has sub-keys. The same data seeds every environment.
3. Build the seed commands, because they run from `dist/`, then seed the row:

    ```bash
    pnpm migration:build
    pnpm migration featureFlag --type seed
    ```

    A re-run creates the missing flags and leaves every stored row as it is, operator changes included, because the upsert's update branch writes `updatedBy` only. The run ends by flushing the cache.

### Add a sub-key

1. Add the key to `EnumFeatureFlagMetadataKey`, camelCase, and add its value to the flag's `metadata` in the seed data. A duration key ends in its unit, the one a person types (`passwordLockDurationInMinutes`, `inviteExpiresInDays`).
2. For a number an operator tunes, add a zod schema to `src/modules/feature-flag/validations/feature-flag.metadata.validation.ts`, named after the PascalCase sub-key with its integer bounds (`FeatureFlagMetadataMaxWorkspacesPerUserSchema`). Add its case to the `superRefine` of `FeatureFlagUpdateMetadataRequestSchema` in `src/modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto.ts`. The service checks no bound.
3. A seed is seed-once, so a new sub-key on a stored flag reaches the database only through `pnpm migration:fresh`, which drops all data and seeds again. The admin API updates values and never adds or removes a key.

## Check the result

1. Run the type check and the unit specs of the module that uses the flag:

    ```bash
    pnpm typecheck
    pnpm test <module>
    ```

2. Boot the application with `pnpm start:dev` and call the route with the flag enabled. It answers normally.
3. Disable the flag through the admin status update. BullBoard shows the `invalidate` job of the `cache` queue completed, and the route then answers 404 with the `featureFlag.error.disabled` message. A route whose flag row is missing answers 500 instead.
4. For a sub-key gate, set the sub-key to `false` through the admin metadata update. The gated action answers 404.
5. For an added flag, its row appears in the admin flag list after the seed.

## Related tasks

- [Route Protection Guide][ref-doc-guide-route-protection]: stack the rest of the decorators
- [Seed Guide][ref-doc-guide-seed]: run and reset seeds

<!-- REFERENCES -->

[ref-doc-concept-feature-flag]: ../concepts/feature-flag.md
[ref-doc-reference-feature-flag]: ../reference/feature-flag.md
[ref-doc-reference-configuration-feature-flag]: ../reference/configuration.md#featureflag
[ref-doc-reference-decorators-and-guards-order]: ../reference/decorators-and-guards.md#decorator-order
[ref-doc-guide-route-protection]: route-protection.md
[ref-doc-guide-seed]: seed.md#run-one-seed
[ref-doc-guide-status-code]: status-code.md
