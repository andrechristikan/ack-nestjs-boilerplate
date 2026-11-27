---
title: Pagination Guide
description: Build an offset or cursor list route end to end, from the sort presets and the list schema to the repository read and the response decorator.
---

# Pagination Guide

This guide shows how to add a list route that pages by offset or by cursor, for a developer who adds a list to a feature module.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Offset differences](#offset-differences)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Pagination][ref-doc-concept-pagination]: how offset, cursor, the keyset, and the presets work
- [Pagination Reference][ref-doc-reference-pagination]: the limits, the query parameters, the metadata, and the filter helpers
- [Schema Guide][ref-doc-guide-schema]: the response schema of the item
- [API Documentation Guide][ref-doc-guide-api-documentation]: the description that names the presets

## Prerequisites

- The Prisma model the list reads, and its repository ([Database][ref-doc-concept-database]).
- The strategy of the route. A route under `/admin` pages by offset, and a route of any other scope pages by cursor.
- For a cursor route, sort fields that are immutable and never null on a row the route returns.
- A response schema for one item, and the item type the repository returns.

## Steps

The steps build a cursor route end to end, the cursor list of roles for the system scope. The offset differences follow in their own section.

1. Add the preset enum to `src/modules/<module>/enums/<module>.enum.ts`. Each member is the name a client sends, and a preset name says what its order means (`src/modules/role/enums/role.enum.ts`):

    ```typescript
    export enum EnumRoleOrderBy {
        latest = 'latest',
        name = 'name',
    }
    ```

2. Add the search fields, the presets, the filter's allowed values, and the cursor scope to `src/modules/<module>/constants/<module>.list.constant.ts`. The preset constant is keyed by the enum and checked against the model's scalar fields. `RoleDefaultType` is the list of values the `type` filter accepts, here every member of `EnumRoleType`. The scope is one constant per cursor endpoint, and its value equals its name (`src/modules/role/constants/role.list.constant.ts`):

    ```typescript
    export const RoleDefaultAvailableSearch = [
        Prisma.RoleScalarFieldEnum.name,
    ] as const satisfies ReadonlyArray<Prisma.RoleScalarFieldEnum>;

    export const RoleOrderBy = {
        [EnumRoleOrderBy.latest]: [
            {
                [Prisma.RoleScalarFieldEnum.createdAt]:
                    EnumPaginationOrderDirectionType.desc,
            },
        ],
        [EnumRoleOrderBy.name]: [
            {
                [Prisma.RoleScalarFieldEnum.name]:
                    EnumPaginationOrderDirectionType.asc,
            },
        ],
    } as const satisfies IPaginationOrderByPresets<
        Prisma.RoleScalarFieldEnum,
        EnumRoleOrderBy
    >;

    export const RoleDefaultType = Object.values(EnumRoleType);

    export const RoleSystemListCursorScope = 'RoleSystemListCursorScope';
    ```

    Every field of every preset on a cursor route must be immutable and never null: a preset on a mutable field such as `updatedAt` belongs to an offset route.

3. Write the list request schema in `dtos/request/<module>.<scope>-list.request.dto.ts`. It extends `PaginationCursorQuerySchema`, which carries `cursor`, `perPage`, and `search`. It names the search fields in the `search` meta, declares `orderBy` as the preset enum or an empty string, and adds the filters, each with an upper bound (`src/modules/role/dtos/request/role.system-list.request.dto.ts`):

    ```typescript
    export const RoleSystemListRequestSchema =
        PaginationCursorQuerySchema.extend({
            search: PaginationCursorQuerySchema.shape.search.meta({
                description: `Search query, available fields: ${RoleDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
                example: '',
            }),
            orderBy: z
                .union([z.enum(EnumRoleOrderBy), z.literal('')])
                .optional()
                .meta({
                    description: `Sort preset name. Available presets: ${Object.values(EnumRoleOrderBy).join(', ')}. An empty or absent value uses \`${EnumRoleOrderBy.latest}\`.`,
                    example: EnumRoleOrderBy.latest,
                }),
            type: z
                .string()
                .max(PaginationMaxFilterLength)
                .optional()
                .meta({
                    description: `Filter by type, comma-delimited, at most ${PaginationMaxFilterLength} characters`,
                    example: '',
                }),
        });
    ```

    A list with no search field drops it with `.omit({ search: true })`.

4. Add the repository read. It takes the params the use case produced, `IPaginationQueryCursorParams`, merges the search `where` with its own filters, and passes the Prisma delegate of its model. Pass `select` or `include`, never both (`src/modules/role/repositories/role.repository.ts`):

    ```typescript
    async findWithPaginationCursorBySystem(
        { where, ...params }: IPaginationQueryCursorParams,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.paginationService.cursor(this.databaseService.client.role, {
            ...params,
            where: {
                ...where,
                ...type,
            },
            include: RoleWithPolicyCountInclude,
        });
    }
    ```

5. Add a service method that forwards the params and the filter fragment to the repository (`src/modules/role/services/role.service.ts`):

    ```typescript
    async getListCursorBySystem(
        pagination: IPaginationQueryCursorParams,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.roleRepository.findWithPaginationCursorBySystem(
            pagination,
            type ?? null
        );
    }
    ```

6. Write the use case. It builds the params with `PaginationQueryUtil`, builds each filter with `PaginationFilterUtil`, merges the state into the request store, and calls the service with the params and the filter's `where` fragment. A cursor route passes its `scope` as well. The `inEnum` call takes the field, the query value, and the allowed values, and it returns `null` for a blank value or `{ where, storeFilter }` (`src/modules/role/use-cases/role.get-list-cursor-by-system.use-case.ts`):

    ```typescript
    const { params, storePatch } = this.paginationQueryUtil.cursor(query, {
        scope: RoleSystemListCursorScope,
        availableSearch: RoleDefaultAvailableSearch,
        orderBy: RoleOrderBy,
        defaultOrderBy: EnumRoleOrderBy.latest,
    });
    const type = this.paginationFilterUtil.inEnum(
        Prisma.RoleScalarFieldEnum.type,
        query.type,
        RoleDefaultType
    );
    this.requestStoreService.merge(PaginationStoreKey, {
        ...storePatch,
        filters: {
            ...storePatch.filters,
            ...(type?.storeFilter ?? {}),
        },
    });

    const { data, ...others } = await this.roleService.getListCursorBySystem(
        params,
        type?.where
    );
    ```

    The `storeFilter` goes to the request store for the response metadata, and the `where` fragment goes down through the service to the repository.

7. Register the use case in its `<Module>UseCaseModule`, in `providers` and in `exports`, so the router module that mounts the controller can inject it (`src/modules/role/role.use-case.module.ts`):

    ```typescript
    providers: [
        RoleGetListOffsetByAdminUseCase,
        RoleGetListCursorBySystemUseCase,
        /* the other use cases follow */
    ],
    ```

8. Bind the schema and the page decorator in the controller. `@ResponsePagination` takes the schema of one item, and the method returns the page (`src/modules/role/controllers/role.system.controller.ts`):

    ```typescript
    @Doc({
        summary: 'get list of roles',
        description:
            'orderBy presets: latest (createdAt descending, default), name (name ascending).',
    })
    @ResponsePagination('role.list', { schema: RoleListResponseSchema })
    @ApiKeySystemProtected()
    @Get('/list')
    async list(
        @Query({ schema: RoleSystemListRequestSchema })
        query: RoleSystemListRequestDto
    ): Promise<IResponsePaginationReturn<RoleListResponseDto>> {
        return this.roleGetListCursorBySystemUseCase.execute(query);
    }
    ```

9. Add the message path of the route to the language file ([I18n Guide][ref-doc-guide-i18n]).
10. Write the unit specs. The use case spec sits in `test/unit/modules/<module>/use-cases/<module>.<action>.use-case.spec.ts` and asserts the params the use case passes to the service, the merge into the request store, and the mapping of the rows (`test/unit/modules/role/use-cases/role.get-list-cursor-by-system.use-case.spec.ts`). The service spec sits in `test/unit/modules/<module>/services/`, and the schema spec in `test/unit/modules/<module>/dtos/request/`.

## Offset differences

An offset route under `/admin` follows the same ten steps with these changes:

1. The list schema extends `PaginationOffsetQuerySchema`, which carries `page`, `perPage`, and `search` and has no `cursor` (`src/modules/role/dtos/request/role.admin-list.request.dto.ts`).
2. The constants file holds no scope, and its presets may sort a mutable field.
3. The use case calls `paginationQueryUtil.offset` with the same options minus `scope`, and the repository takes `IPaginationQueryOffsetParams` and calls `paginationService.offset` (`src/modules/role/use-cases/role.get-list-offset-by-admin.use-case.ts`).
4. The response metadata carries `page`, `totalPage`, `nextPage`, `previousPage`, and `count`, and the client never sends a cursor.

## Check the result

1. Run the typecheck and the unit specs of the module:

    ```bash
    pnpm typecheck
    pnpm test <module>
    ```

2. Call the route with no parameters. The response holds the first page, and `metadata` reports `type`, `perPage`, `orderBy` as the default preset, `availableOrderBy` with every preset, and `availableSearch`.
3. On an offset route, request `page=2` and read `page`, `totalPage`, and `previousPage`. On a cursor route, send `metadata.nextCursor` back as `cursor` and read the next page.
4. Send a cursor with a changed `search` or `orderBy`. The route answers 422 with `PaginationInvalidCursorPaginationParamsException`, which means the client restarts from the first page.
5. Send an `orderBy` that is not a preset, and a key the schema does not name. Each answers 422 with the code `50300`.

## Related tasks

- [Schema Guide][ref-doc-guide-schema]: write the item schema.
- [API Documentation Guide][ref-doc-guide-api-documentation]: check the list query in the generated document.
- [Pagination Reference][ref-doc-reference-pagination]: look up a limit, a metadata field, or an error.

<!-- REFERENCES -->

[ref-doc-concept-pagination]: ../concepts/pagination.md
[ref-doc-reference-pagination]: ../reference/pagination.md
[ref-doc-guide-schema]: schema.md
[ref-doc-guide-api-documentation]: api-documentation.md
[ref-doc-guide-i18n]: i18n.md
[ref-doc-concept-database]: ../concepts/database.md
