---
title: Schema Guide
description: Write the zod request and response schemas of a route, bind them on the controller, and check that the route validates and strips as declared.
---

# Schema Guide

This guide shows how to write the request and response schemas of a route and bind them, for a developer who adds a route to a feature module.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Request Validation][ref-doc-concept-request-validation]: how the pipe checks a schema and maps its issues
- [Response][ref-doc-concept-response]: how the interceptor validates and strips the payload
- [HTTP Contract][ref-doc-reference-http-contract]: the envelope the route answers
- [Pagination Guide][ref-doc-guide-pagination]: the list query schema
- [I18n Guide][ref-doc-guide-i18n]: the message path a route declares

## Prerequisites

- A feature module with a controller and a use case for the route.
- The shape of the payload the route accepts and the shape it returns.
- A message path for the success message, with its key added to the module's language file ([I18n Guide][ref-doc-guide-i18n]).

## Steps

1. Create the request schema in `src/modules/<module>/dtos/request/<module>.<action>.request.dto.ts`. One file holds one schema constant and the type inferred from it. The root is `z.strictObject`, every field has its constraints and a `.meta`, and free text a person types is trimmed and lower-cased. This is the claim-username request (`src/modules/user/dtos/request/user.claim-username.request.dto.ts`), with its imports:

    ```typescript
    import { UserUsernameRegex } from '@modules/user/constants/user.constant';
    import { z } from 'zod';

    export const UserClaimUsernameRequestSchema = z.strictObject({
        username: z
            .string()
            .trim()
            .toLowerCase()
            .min(3)
            .max(50)
            .regex(UserUsernameRegex)
            .meta({
                description: 'username to claim',
                example: 'john_doe123',
            })
            .transform(value => value as Lowercase<string>),
    });

    export type UserClaimUsernameRequestDto = z.infer<
        typeof UserClaimUsernameRequestSchema
    >;
    ```

2. Build a related schema from an existing one with `.extend()`, `.omit()`, `.pick()`, or `.partial()`, and never copy fields. The create request of a role extends its update request (`src/modules/role/dtos/request/role.create.request.dto.ts`):

    ```typescript
    export const RoleCreateRequestSchema = RoleUpdateRequestSchema.extend({
        description: z.string().trim().toLowerCase().max(500).optional().meta({
            description: 'Description of role',
            example: faker.lorem.sentence().toLowerCase(),
        }),
        /* name follows */
    });
    ```

3. Make an update request a full replace. Every editable field is required, and a field that may be empty is `.nullable()` so that `null` clears it. Do not build an update schema with `.partial()` (`src/modules/role/dtos/request/role.update.request.dto.ts`):

    ```typescript
    export const RoleUpdateRequestSchema = z.strictObject({
        description: z.string().trim().toLowerCase().max(500).nullable().meta({
            description: 'Description of role; null clears it',
            example: faker.lorem.sentence().toLowerCase(),
        }),
        type: z.enum([EnumRoleType.admin, EnumRoleType.user]).meta({
            description: 'Representative for role type',
            example: EnumRoleType.admin,
        }),
    });
    ```

4. For a check too detailed for a chained method, such as an email or an id, import a shared validation from `src/common/request/validations/` or add one to the module's `validations/` folder. A validation file exports schema constants only.
5. Create the response schema in `src/modules/<module>/dtos/<module>.dto.ts` where both directions share it, or in `src/modules/<module>/dtos/response/<module>.<noun>.response.dto.ts` for one only the response uses. Compose it from a base, and declare only the fields the audience of the route may read. A field left out never leaves the API. This is the role schema, the one step 7 binds (`src/modules/role/dtos/role.dto.ts`):

    ```typescript
    export const RoleSchema = DatabaseResponseSchema.omit({
        deletedAt: true,
        deletedBy: true,
    }).extend({
        name: z.string().meta({
            description: 'Name of role',
            example: faker.person.jobTitle(),
        }),
        /* description, type, and policies follow */
    });

    export type RoleDto = z.infer<typeof RoleSchema>;
    ```

6. Import the binding pieces into the controller. The parameter decorators are the framework's own, and their `schema` option binds a zod schema to the parameter:

    ```typescript
    import { Body, Controller, Param, Post, Query } from '@nestjs/common';
    import { Doc } from '@common/doc/decorators/doc.decorator';
    import { Response } from '@common/response/decorators/response.decorator';
    import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
    ```

    `RequestMongoIdSchema` is the kit's schema for a 24-character hex id.

7. Bind the schemas in the controller. The body and each path param take a `{ schema }`, and the success decorator takes the response schema and the message path. This is the create route of a role (`src/modules/role/controllers/role.admin.controller.ts`), with its guard decorators as they stand:

    ```typescript
    @Doc({ summary: 'create a role' })
    @Response('role.create', { schema: RoleSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @UserContext() userContext: IUserContext,
        @Body({ schema: RoleCreateRequestSchema })
        body: RoleCreateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleCreateByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            userContext,
            body
        );
    }
    ```

8. Bind a path param to a named schema with `@Param('roleId', { schema: RequestMongoIdSchema })`. A route with no payload takes `@Response('<message path>')` with no schema and returns `Promise<IResponseReturn<void>>`, as the delete route of the same controller does.
9. Bind a query the same way, with `@Query({ schema })`: the pipe validates it with the strict rule of a body. A query that is not a list is a strict object of its own fields. This is the export route of the user admin controller, whose schema picks three fields of the list schema (`src/modules/user/controllers/user.admin.controller.ts`):

    ```typescript
    @Query({ schema: UserExportRequestSchema })
    query: UserExportRequestDto
    ```

    A list query extends the pagination base schemas and carries `orderBy` and its filters: [Pagination Guide][ref-doc-guide-pagination]. A query with no bound schema reaches the handler unchecked, so bind one on every query a route reads.

10. Return the payload from the use case inside `IResponseReturn`, as `{ data }`. A payload returned outside it reaches the envelope as no `data`.
11. Add a unit spec for each request schema in `test/unit/modules/<module>/dtos/request/<module>.<action>.request.dto.spec.ts`. It parses a valid payload and asserts that exactly the declared fields survive, then parses each invalid case and asserts the issue `path` and `code` (`test/unit/modules/role/dtos/request/role.update.request.dto.spec.ts`). The spec of a response schema sits in `test/unit/modules/<module>/dtos/` and asserts that an undeclared key is stripped.

## Check the result

1. Run the typecheck and the unit specs of the module:

    ```bash
    pnpm typecheck
    pnpm test <module>
    ```

2. Start the API with `pnpm start:dev`, open the Swagger UI at `/docs`, and read the route. Every field of both schemas shows its description and example, and the `data` of the success response lists only the response fields.
3. Send a body with an extra key. The route answers HTTP 422. The body carries the `statusCode` `50300`, the `statusCodeKey` `validation`, the module `request`, the message `There are validation errors.`, and an `errors` array. The unknown key is one entry with the key `unrecognizedKeys` and the property `body`, because a root issue on a whole-body binding takes the argument kind as its property ([Request Validation][ref-doc-concept-request-validation]).
4. Send a path param that is not a 24-character hex id. The route answers 422 with the same envelope, and the `errors` entry names the parameter in `property`, such as `roleId`.

## Related tasks

- [I18n Guide][ref-doc-guide-i18n]: add the message path the route declares.
- [Status Code Guide][ref-doc-guide-status-code]: add the exception a use case throws.
- [API Documentation Guide][ref-doc-guide-api-documentation]: add the summary and read the generated document.
- [Pagination Guide][ref-doc-guide-pagination]: write a list query schema.

<!-- REFERENCES -->

[ref-doc-concept-request-validation]: ../concepts/request-validation.md
[ref-doc-concept-response]: ../concepts/response.md
[ref-doc-reference-http-contract]: ../reference/http-contract.md
[ref-doc-guide-pagination]: pagination.md
[ref-doc-guide-i18n]: i18n.md
[ref-doc-guide-status-code]: status-code.md
[ref-doc-guide-api-documentation]: api-documentation.md
