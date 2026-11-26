---
title: API Documentation Guide
description: Document a route with @Doc, publish the errors a new guard or flow can raise, and get the generated swagger.json.
---

# API Documentation Guide

This guide shows how to document a route and read the generated OpenAPI document, for a developer who adds a route or a decorator.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [API Documentation][ref-doc-concept-api-documentation]: how the document is assembled and who documents what
- [Schema Guide][ref-doc-guide-schema]: the schemas the document reads
- [Pagination Guide][ref-doc-guide-pagination]: the sort presets a list route names in its description
- [Status Codes][ref-doc-reference-status-codes]: the code behind each documented error

## Prerequisites

- A controller method with its response decorator (`@Response`, `@ResponsePagination`, or `@ResponseFile`) and its zod schemas bound ([Schema Guide][ref-doc-guide-schema]).
- A runnable checkout: `pnpm install`, then `pnpm generate`, and a running API for the checks below ([Installation][ref-doc-installation]).

## Steps

1. Add `@Doc` at the top of the decorator stack of the method. The summary is a lowercase phrase. A route needs nothing else for its operation, its inbound headers, or the errors every request can raise:

    ```typescript
    @Doc({ summary: 'create a role' })
    @Response('role.create', { schema: RoleSchema })
    ```

    That excerpt comes from `src/modules/role/controllers/role.admin.controller.ts`.

2. Keep the decorators of a method in this order, top to bottom: `@Doc`, the response decorator, the `*Protected` decorators, then the HTTP method decorator. Nest runs the guards from the bottom up, so the decorator nearest the method runs first. This is the list route of the same controller:

    ```typescript
    @Doc({
        summary: 'get list of roles',
        description:
            'orderBy presets: latest (createdAt descending, default), name (name ascending).',
    })
    @ResponsePagination('role.list', { schema: RoleListResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottleProtected({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    ```

    The decorators between the response decorator and the HTTP method run from the term policy at the top to the API key at the bottom. A `@Post` that returns 200 adds `@HttpCode(HttpStatus.OK)` above the method decorator, and an upload route adds its `FileUpload*` decorator and `@RequestTimeout` there too. The order of the guards and what each one checks: [Authorization][ref-doc-authorization].

3. On a list route, add a `description` that names the sort presets, their order, and the default one, as the excerpt above does.
4. Add each guard or credential as its own `*Protected` decorator. Each one publishes the errors of its guard, so the controller passes no error list.
5. Publish the errors of a new decorator in the module that owns it. Declare an `IDocResponseEntry[]` constant named `<Decorator>DocErrors` in the module's `constants/<module>.constant.ts`, and spread it into `DocErrors` inside the decorator. This is the role decorator (`src/modules/role/decorators/role.decorator.ts`):

    ```typescript
    return applyDecorators(
        UseGuards(RoleGuard),
        SetMetadata(RoleRequiredMetaKey, requiredRoles),
        DocErrors(...RoleProtectedDocErrors)
    );
    ```

6. Declare each entry with the HTTP status, the application status code, and the message path (`src/modules/role/constants/role.constant.ts`):

    ```typescript
    export const RoleProtectedDocErrors: IDocResponseEntry[] = [
        {
            httpStatus: HttpStatus.FORBIDDEN,
            statusCode: EnumRoleStatusCodeError.forbidden,
            messagePath: 'role.error.forbidden',
        },
        /* the user guard-missing entry follows */
    ];
    ```

7. Publish an error that only one flow raises with the `errors` option of `@Doc`, which takes the same `IDocResponseEntry` entries as the constant above: `@Doc({ summary: '...', errors: [entry] })`. Use it only for an error the document must show and no decorator publishes. No route of the checkout uses the option today.
8. Describe each field of a schema with `.meta({ description, example })`. The document builds from the schemas, so a field with no `.meta` shows no description.
9. Write no `@ApiOperation`, `@ApiResponse`, or separate documentation file. A controller never calls `DocErrors` itself.

## Check the result

1. Start the API outside production, where `APP_ENV` is not `production`:

    ```bash
    pnpm start:dev
    ```

2. Open the Swagger UI at `http://localhost:3000/docs`, find the route, and check its summary, its parameters, its success response, and its error responses.
3. Fetch the same document as JSON from `/docs/json`:

    ```bash
    curl http://localhost:3000/docs/json
    ```

4. Read the file the boot wrote, `generated/swagger.json`. Each start outside production rewrites it, so a tool that needs the document boots the API once and reads the file.

The port in the URLs is `APP_HTTP_PORT` ([Configuration Reference][ref-doc-reference-configuration]). With `APP_ENV` set to `production` none of the three exists.

## Related tasks

- [Schema Guide][ref-doc-guide-schema]: write the schemas the document reads.
- [Status Code Guide][ref-doc-guide-status-code]: add a code for an error you publish.
- [Pagination Guide][ref-doc-guide-pagination]: name the presets of a list route.

<!-- REFERENCES -->

[ref-doc-concept-api-documentation]: ../concepts/api-documentation.md
[ref-doc-guide-schema]: schema.md
[ref-doc-guide-pagination]: pagination.md
[ref-doc-guide-status-code]: status-code.md
[ref-doc-reference-status-codes]: ../reference/status-codes.md
[ref-doc-reference-configuration]: ../reference/configuration.md
[ref-doc-installation]: ../getting-started/installation.md
[ref-doc-authorization]: ../authorization.md#decorator-order
