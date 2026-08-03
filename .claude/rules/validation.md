# Validation & DTOs — `class-validator` + `class-transformer`

Detail in `docs/request-validation.md` and `docs/response.md`.

## Request DTOs

- Live in `<module>/dtos/request/`, class named `<Module><Action>RequestDto`.
- Every field carries `class-validator` decorators plus `@ApiProperty` for Swagger. A field with no validator is an unvalidated wire input.
- `@Transform` normalizes at the boundary (`value.toLowerCase().trim()` for an email). Normalization belongs here, not in the service.
- Shared custom validators live in `src/common/request/validations/` (`IsCustomEmail`, `IsPassword`, `IsAfterNow`, …). Module-specific ones go in `<module>/validations/`. Never inline a regex that duplicates an existing validator.
- Optional fields are `field?: Type` — this is the ONE layer where `undefined` is legal (`rules/null-safety.md`).

## Query DTOs

Pagination and filtering come from the `@Pagination*` decorators and pipes in `src/common/pagination/` (see `rules/pagination.md`), not from hand-rolled `@Query` parsing. Reach for a Query DTO when an endpoint has its own non-pagination filter set; otherwise use the existing decorators.

## Response DTOs — `@Expose()` is load-bearing

Response serialization runs through `ResponseUtil.serialize()`, which calls `plainToInstance` with `excludeExtraneousValues: true`. That makes the DTO **opt-in**: a field without `@Expose()` is dropped.

- **Every field you intend to return MUST carry `@Expose()`.** A missing one is not a style slip; it is a silently absent field in the API response.
- The flip side is the security property that makes this design worth it: **a new un-exposed field is dropped by default (fail-closed)**. A column added to the Prisma model does not leak just because someone forgot to think about it.
- **Never turn off `excludeExtraneousValues`** for one endpoint, and never bypass `ResponseUtil` with a raw `plainToInstance`. The option is defined once for the whole app.
- Hide an inherited field with `@Exclude()` plus `@ApiHideProperty()` — both, so the JSON and the Swagger schema agree.
- `@Type(() => NestedDto)` is required on every nested DTO and array-of-DTO field, or the nested object serializes as a plain object and its own `@Expose` rules never run.

Field names are the JSON keys. Rename them freely when the current name is wrong — no client compatibility is owed here (`rules/naming.md`).

## DTO placement

| Shape | Location |
|---|---|
| Request only | `dtos/request/<module>.<action>.request.dto.ts` |
| Response only | `dtos/response/<module>.<action>.response.dto.ts` |
| Shared by both, or a nested value object | `dtos/<module>.<noun>.dto.ts` |

A DTO is the module's transport shape between HTTP and the service. Do not introduce a third model between the controller and the service.
