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

## Response DTOs and placement

`@Expose()`, `@Type()`, the `dtos/request` / `dtos/response` split, and the envelope return
types are `rules/dto.md`. Swagger annotation is `rules/swagger.md`.
