---
title: Module Guide
description: Create a feature module from its status-code block and model to its layers, module files, router mount, and messages.
---

# Module Guide

This guide shows how to add a feature module under `src/modules/`, for a developer who builds a new domain. It uses `src/modules/device/` as the reference.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Architecture][ref-doc-architecture]: the layers, the import levels, and what a module is
- [Database][ref-doc-concept-database]: the client, transactions, and audit stamping a repository uses
- [Queue][ref-doc-concept-queue]: the queue class and the outbox a module with side effects adds
- [Cache][ref-doc-concept-cache]: the cache class and the `readThrough` call a cached read uses
- [Status Code Guide][ref-doc-guide-status-code]: claim the status-code block
- [Schema Guide][ref-doc-guide-schema]: write the request and response schemas
- [Pagination Guide][ref-doc-guide-pagination]: add a list route
- [I18n Guide][ref-doc-guide-i18n]: add the message file

## Prerequisites

- The local stack runs ([Installation][ref-doc-installation]).
- The module is one domain. What it does together with another module is a use case's sequence, never a call from one module's service to another's.
- The scopes it serves are known: `admin`, `public`, `shared`, `system`, `user`.
- Every file name is the module name, an optional noun or action, and the role, such as `device.service.ts` and `device.refresh.request.dto.ts`, with at most four dot-separated parts. Every class is prefixed with the module name.

## Steps

1. Claim a status-code block. Follow the [Status Code Guide][ref-doc-guide-status-code] and create `src/modules/<module>/enums/<module>.status-code.enum.ts` with the first member at the block base (`EnumDeviceStatusCodeError` in `src/modules/device/enums/device.status-code.enum.ts`).
2. Add the model to `prisma/schema.prisma`, then generate the client and push the schema:

    ```bash
    pnpm db:generate
    pnpm db:migrate
    ```

    A model has an `id`, the audit columns, a plural `@@map`, and a `@relation` for every `@db.ObjectId` field but `id` and the audit fields. Each relation is named on both sides and declares `onDelete` and `onUpdate` ([Relations and referential actions][ref-doc-reference-database-relations]). This is the `Device` model (`prisma/schema.prisma`):

    ```prisma
    model Device {
      id           String             @id @default(auto()) @map("_id") @db.ObjectId
      fingerprint  String
      name         String?
      platform     EnumDevicePlatform
      lastActiveAt DateTime           @default(now())

      createdAt DateTime @default(now())
      createdBy String?  @db.ObjectId
      updatedAt DateTime @updatedAt
      updatedBy String?  @db.ObjectId

      ownerships DeviceOwnership[] @relation("DeviceOwnershipDevice")

      @@unique(fields: [fingerprint])
      @@index(fields: [createdAt(sort: Desc)])
      @@map("Devices")
    }
    ```

3. Choose the module's level. A module is `@Global()` only when a guard, strategy, interceptor, or decorator outside the module injects its classes. That condition is necessary and not sufficient: the global feature modules are `ApiKeyModule`, `AuthModule`, `FeatureFlagModule`, `PolicyModule`, `RoleModule`, `SessionModule`, and `TermPolicyModule`. A plain module whose own guard a controller carries stays plain (`WorkspaceModule`, `UserModule`), and the router module of the controller's scope imports it (step 6). Every plain feature module's services inject no other plain module's service or util.
4. Write the files bottom up, each in its own folder under `src/modules/<module>/`:

    | Layer | File | Reference |
    | --- | --- | --- |
    | Repository port | `interfaces/<module>.repository.interface.ts`, declares `I<Module>Repository` | `IDeviceRepository` in `src/modules/device/interfaces/device.repository.interface.ts` |
    | Repository | `repositories/<module>.repository.ts`, implements the port | `src/modules/device/repositories/device.repository.ts` |
    | Second repository, for a second model | `repositories/<module>.<concern>.repository.ts` and `interfaces/<module>.<concern>-repository.interface.ts` | `src/modules/device/repositories/device.ownership.repository.ts` |
    | Data shapes | `interfaces/<module>.interface.ts` | `src/modules/device/interfaces/device.interface.ts` |
    | Module constants, selects and regexes | `constants/<module>.constant.ts` | `src/modules/device/constants/device.constant.ts` |
    | List constants | `constants/<module>.list.constant.ts` | `DeviceOrderBy` in `src/modules/device/constants/device.list.constant.ts` |
    | Module enums | `enums/<module>.enum.ts` | `src/modules/device/enums/device.enum.ts` |
    | Exception, one class per file | `exceptions/<module>.<descriptor>.exception.ts` | `src/modules/device/exceptions/device.not-found.exception.ts` |
    | Cache, only for a cached read ([Cache][ref-doc-concept-cache]) | `caches/<module>.cache.ts` | `src/modules/api-key/caches/api-key.cache.ts` |
    | Util, only when two classes or a use case share a pure method | `utils/<module>.util.ts` | `src/modules/device/utils/device.util.ts` |
    | Service | `services/<module>.service.ts` | `src/modules/device/services/device.service.ts` |
    | Queue class, only for a module with side effects ([Queue Guide][ref-doc-guide-queue]) | `queues/<module>.queue.ts` | `src/modules/activity-log/queues/activity-log.queue.ts` |
    | Request schema | `dtos/request/<module>.<action>.request.dto.ts` | `src/modules/device/dtos/request/device.refresh.request.dto.ts` |
    | Response schema | `dtos/response/<module>.response.dto.ts` | `src/modules/device/dtos/response/device.response.dto.ts` |
    | Use case, one per endpoint or job | `use-cases/<module>.<action>.use-case.ts` | `src/modules/device/use-cases/device.remove.use-case.ts` |
    | Controller, one per scope | `controllers/<module>.<scope>.controller.ts` | `src/modules/device/controllers/device.shared.controller.ts` |
    - A repository issues statements against its own model only, through `DatabaseService.client` or the `tx` of an `*InTx` method ([Transactions][ref-doc-concept-database-transactions]).
    - A service holds the module's operations. A use case holds one action: which services run, in which order, inside the one transaction it opens, when it opens one.
    - A use case implements `IAppUseCase` and exposes one public method, `execute`. A controller method returns one use case's `execute`.
    - The schemas follow the [Schema Guide][ref-doc-guide-schema], and a list route follows the [Pagination Guide][ref-doc-guide-pagination].
    - Write the unit spec of each service and use case first. Specs mirror the tree under `test/unit/modules/<module>/`.

5. Create the two module files. `<module>.module.ts` provides the repositories, services, utils, caches, and queue classes, and exports the services, utils, and queue classes. It never exports a cache or a repository, and its `controllers` stays empty because the router modules declare the controllers. This is `src/modules/device/device.module.ts`:

    ```typescript
    @Module({
        controllers: [],
        providers: [
            DeviceOwnershipRepository,
            DeviceRepository,
            DeviceService,
            DeviceUtil,
        ],
        exports: [DeviceService, DeviceUtil],
        imports: [ActivityLogModule],
    })
    export class DeviceModule {}
    ```

    `DeviceModule` imports `ActivityLogModule` because `DeviceService` injects `ActivityLogQueue`. A plain module imports only the `<Module>Module` of each non-global feature whose queue class its services inject, the queue registrations for the queues it owns, `AwsModule` or `FirebaseModule` where a provider injects it, and a third-party module it alone uses.

    `<module>.use-case.module.ts` provides and exports the module's use cases and imports the `<Module>Module` of each non-global module whose services its use cases inject, its own included (`src/modules/device/device.use-case.module.ts`). Nothing but `src/router/` imports a use-case module.

6. Register the module:
    - Add each controller to `controllers` of `src/router/http/router.http.<scope>.module.ts`, and add the module's `<Module>UseCaseModule` to its `imports`. Add the `<Module>Module` of every non-global feature whose guard the controller carries. A missing import aborts the boot with `UnknownDependenciesException`.
    - A `@Global()` module carries `@Global()` and a no-argument `forRoot()` with no `global` key. `src/common/common.module.ts` imports it once, as `SessionModule.forRoot()`.
    - A module with a queue or a processor follows the [Queue Guide][ref-doc-guide-queue], which also lists the processor registration in `src/router/processor/router.processor.module.ts`.
7. Add the messages in `src/languages/en/<module>.json`, and one file per language directory under `src/languages/` ([I18n Guide][ref-doc-guide-i18n]).
8. Add seed rows only when an empty database needs them ([Seed Guide][ref-doc-guide-seed]).

## Check the result

1. Run the type check and the module's unit specs:

    ```bash
    pnpm typecheck
    pnpm test <module>
    ```

2. Start the application with `pnpm start:dev`. A wiring defect shows only at boot: a missing provider aborts it with `UnknownDependenciesException`, and a module import cycle throws `ReferenceError`. The log prints no such line when the wiring is correct.
3. Open Swagger at `http://localhost:3000/docs`. The new routes appear under the tag the controller declares with `@ApiTags('modules.<scope>.<module>')` (`DeviceSharedController` declares `modules.shared.user.device`), as the [API Documentation Guide][ref-doc-guide-api-documentation] describes.

## Related tasks

- [Status Code Guide][ref-doc-guide-status-code]: add an exception and its message
- [Queue Guide][ref-doc-guide-queue]: add a queue, a processor, and an outbox effect
- [Seed Guide][ref-doc-guide-seed]: add the reference rows the module needs
- [API Documentation Guide][ref-doc-guide-api-documentation]: describe the new routes

<!-- REFERENCES -->

[ref-doc-architecture]: ../concepts/architecture.md
[ref-doc-concept-database]: ../concepts/database.md
[ref-doc-concept-database-transactions]: ../concepts/database.md#transactions
[ref-doc-concept-queue]: ../concepts/queue.md
[ref-doc-concept-cache]: ../concepts/cache.md
[ref-doc-guide-status-code]: status-code.md
[ref-doc-guide-schema]: schema.md
[ref-doc-guide-pagination]: pagination.md
[ref-doc-guide-i18n]: i18n.md
[ref-doc-guide-queue]: queue.md
[ref-doc-guide-seed]: seed.md
[ref-doc-guide-api-documentation]: api-documentation.md
[ref-doc-installation]: ../getting-started/installation.md
[ref-doc-reference-database-relations]: ../reference/database.md#relations-and-referential-actions
