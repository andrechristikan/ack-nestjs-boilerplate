# Code style

Mechanical style. Naming and casing are `rules/naming.md`. Layer placement is
`rules/architecture.md`.

## NestJS idiomatic — no hand-rolled substitutes

Use the framework the Nest way: modules, DI, providers, guards, pipes, interceptors,
decorators, lifecycle hooks. **If Nest already provides it, a hand-rolled version is a defect
regardless of how well it works.** No service locator, no manual instantiation of an
injectable, no bare `@UseGuards` where a `@<Feature>Protected()` decorator is the convention.

## Path aliases — a relative import is a defect

```
@app/*  @common/*  @config  @configs/*  @modules/*  @queues/*
@router/*  @migration/*  @test/*  @generated/*  @package
```

`@prisma/client` resolves to `generated/prisma-client`. A `../` in an import is a defect,
**including inside the same module**.

## Private methods sit above public ones

Inside a class, every `private` method is declared ABOVE the public methods, directly under
the constructor. A reader meets the helpers before the code that calls them, and the public
surface of the class stays in one uninterrupted block instead of being cut apart by helpers.

This is a layout rule, not a visibility rule — it does not change what is private.

## Independent awaits run concurrently (HARD)

When two or more `await`s in the same scope do not depend on each other's result, they run in
one `Promise.all([...])`. Sequential `await`s there are not a style choice — they add every
call's latency together for no reason, and the cost is invisible in review because each line
looks correct on its own.

The exceptions are real, so name them when they apply: an await whose argument uses an earlier
result, a write that must not happen if an earlier step throws, and anything already inside a
Prisma `$transaction` (which sequences by design). See `rules/concurrency.md`.

## Never mirror a type that already has a name

If a shape already exists as a named type, import it. A hand-written inline copy is a mirror:
it drifts silently because nothing makes the two move together. A structural SUBSET is still a
mirror — restating three fields of `IUser` inline means importing `IUser` and picking, not
retyping.

An inline object type is fine when it mirrors nothing. The test: does a named type for this
shape already exist, or is this a structural subset of one? Yes → import it and delete the
copy. No → inline is fine.

## Duplication

Zero copy-paste logic. Written twice is a signal, written three times is a defect. One source
of truth per config value, connection, and constant. **Duplication still beats the wrong
abstraction** — do not abstract to satisfy DRY against YAGNI (`rules/architecture.md`).

## Comments

**Default zero comments.** Types, names, and structure are the contract.

Every comment states FINAL STATE only — what the symbol IS or DOES, present tense. No
history, no decision, no changelog. Deprecation is the one exception, and only with a real
`@deprecated` marker.

`// @note:` is banned. Delete it on sight.

JSDoc is where a written explanation belongs. Optional one-line class JSDoc when the class
name does not say what the provider is. Method JSDoc is the exception. No JSDoc on
interfaces. Banned tags: `@example` `@param` `@returns` `@template` `@throws` `@private`
`@export` `@class` `@implements` `@constraint` `@remarks`.

Inline `//` is rare: something a reader cannot see from that statement and that causes real
damage when missed. Zero per file is normal. No trailing comments.

`TODO` and `FIXME` are work markers and are allowed. `NOTE`, `XXX`, and `HACK` are not used.

After a change lands, re-test every comment it touched. Delete the ones whose subject is
gone.
