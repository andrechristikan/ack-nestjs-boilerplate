---
paths:
    - 'src/modules/**/controllers/**'
    - 'src/router/**'
    - 'src/app/**'
    - '**/decorators/**'
---

# HTTP layer

## Controllers

- The class carries `@ApiTags('modules.<scope>[.<parent>].<moduleCamel>')` and `@Controller({ version: '1', path })`; only the health and hello controllers are `VERSION_NEUTRAL`.
- One `async` endpoint, one `<Module>HttpService` method, the whole request DTO passed in (`null-safety.md`). Its body is `return this.<module>HttpService.<method>(...);` and nothing else: the HTTP service builds every envelope (`dto.md`), `{}` included.
- One controller per scope (`admin public user system shared`), registered by `router.http.<scope>.module.ts` (`src/router/http/`); what that module imports: `layering.md`, Module files.
- A path or query value binds a zod schema (`@Param('userId', { schema: RequestMongoIdSchema })`; a token or slug takes `RequestRequiredStringSchema`). Params are camelCase and explicit, never a bare `:id`; the template and the `@Param` key agree or the value is `undefined`. A new `x-*` header is a `HeaderName` constant `request.config.ts` lists in the CORS headers (`config.md`).

## Route path shape

Everything in the controller's `path:` is its own resource: `/<action>[/:<id>[/<target>]]`. A noun a route decorator introduces opens a sub-resource: `/<sub-resource>[/:<scope-id>][/:<id>][/<target>]/<action>`, action last. The action is one verb; `<verb>-all` only with no row id; a target is its own segment, never folded into the verb (`/update/:id/status`); one verb per path; method and verb agree. A resource noun is singular; a target after an id may be plural. A path closes on a noun only for how the action is performed (`/login/credential`). An analytic route is a read-only `@Get('/<area>/<metric>[/list]')` (`analytic.admin.controller.ts`).

## Responses and OpenAPI

A `@Response*` argument is an i18n path; `@ResponsePagination` takes one item's schema. `IResponseOptions` carries `schema` and `cache` only; status comes from `@HttpCode` or the default, overridable through `metadata` on the return.

OpenAPI rides on the runtime decorators: no `*.doc.ts` factory, no bare `@ApiOperation`. `@Doc({ summary })` emits the global error kit; the summary is a lowercase phrase (`get list of roles`). Endpoint-specific errors use `@DocErrors(httpStatus, ...entries)`. Kit `DocResponseError` calls live in `src/common/doc/constants/doc.constant.ts` and `Doc<Module>ErrorResponses` in `<module>.constant.ts`; a `*Protected` decorator emits its guard's throw set plus its security scheme, named by a module constant (`AuthJwtAccessDocSecurityName`) shared with `src/swagger.ts`. Request shape comes from the zod schema through `standardSchemaConverter` (`src/swagger.ts:80`); `src/swagger.ts` writes `generated/swagger.json` in every environment except production.
