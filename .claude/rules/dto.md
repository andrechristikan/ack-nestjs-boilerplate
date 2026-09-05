# DTOs

A DTO is the module's transport shape. A request DTO enters at the controller and travels as far
down as the shape is still unchanged — that can be the repository (`rules/architecture.md`); a
response DTO is assembled in the HTTP service and goes no deeper. Request-side validation is
`rules/validation.md`; Swagger annotation is `rules/swagger.md`; this file is the DTO shape and
placement rule set. Detail in `docs/request-validation.md` and `docs/response.md`.

## Placement

| Shape | Location |
|---|---|
| Request only | `dtos/request/<module>[.<concern>].request.dto.ts` |
| Response only | `dtos/response/<module>[.<concern>].response.dto.ts` |
| Shared by both, or a nested value object | `dtos/<module>.<noun>.dto.ts` |

**The folders are SINGULAR** — `dtos/request/`, `dtos/response/`. Never `requests/`.

`<concern>` is optional and is an action or a noun; it is **absent when the DTO is the module's
canonical request or response shape** (`device.request.dto.ts` → `DeviceRequestDto`). The
direction segment is the part that is never optional, and the file and the class must agree on
it. Full grammar in `rules/naming.md`.

**Do not introduce a third model between the controller and the service.** A DTO in, a DTO or
an `I*` interface out — no "domain model" layer, no mapper class per endpoint.

## Response DTOs — `@Expose()` is load-bearing (HARD)

Response serialization runs through `ResponseUtil.serialize()`, which calls `plainToInstance`
with `excludeExtraneousValues: true`. That makes the DTO **opt-in: a field without `@Expose()`
is dropped.**

- **Every field you intend to return MUST carry `@Expose()`.** A missing one is not a style
  slip; it is a silently absent field in the API response.
- The flip side is the security property that makes this design worth it: **a new un-exposed
  field is dropped by default (fail-closed)**. A column added to the Prisma model does not leak
  just because someone forgot to think about it.
- **Never turn off `excludeExtraneousValues`** for one endpoint, and never bypass `ResponseUtil`
  with a raw `plainToInstance`. The option is defined once for the whole app.
- Hide an inherited field with `@Exclude()` **plus** `@ApiHideProperty()` — both, so the JSON
  and the Swagger schema agree.
- **`@Type(() => NestedDto)` is required on every nested DTO and array-of-DTO field**, or the
  nested object serializes as a plain object and its own `@Expose` rules never run.

## The envelope, not the DTO

A handler that returns data returns `IResponseReturn<T>`, `IResponsePagingReturn<T>`, or
`IResponseFileReturn` — **never a bare DTO**. The interceptor reads `metadata` off the returned
object, and a bare DTO has none. A handler with nothing to return is `Promise<void>`
(`rules/http.md`).

## Optionality

- Request and Query DTOs are the ONE layer where `undefined` is legal: `field?: Type`.
- A Response DTO field is `field?: Type` with `@Expose()` when genuinely optional, and
  `field: Type | null` when the value is always present-or-null.
- Do not invent `field?: Type | null` on new code (`rules/null-safety.md`).

## Field names

Field names are the JSON keys, and they are camelCase (`rules/case-convention.md`). **Rename
them freely when the current name is wrong** — no client compatibility is owed here. A body
field MUST NOT duplicate a path param; the path is authoritative (`rules/http.md`).

## Never mirror a shape that has a name

A response DTO restating three fields of `IUser` inline is a mirror that drifts. Import the
named type and pick from it (`rules/code-style.md`).

## Specs

A DTO spec asserts that `ResponseUtil.serialize()` returns exactly the `@Expose()`d fields and
that nothing sensitive rides along. That spec is the executable form of the opt-in rule, and
DTOs are inside `collectCoverageFrom` (`rules/testing.md`).
