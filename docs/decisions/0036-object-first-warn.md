# 0036. A warn carrying a caught error is object-first

- Status: accepted
- Date: 2026-11-08

## Context

The cache kit warns on a non-connection Redis error and continues. nestjs-pino serializes only the first argument as the log object, so a message-first warn with the error as an extra argument loses the error and its stack.

## Decision

A `warn` that carries a caught error is object-first, like `error`: `this.logger.warn({ key, err: error }, 'context')`.

## Considered options

- object-first for a warn carrying a caught error (chosen)
- message-first with the error as an extra argument: rejected, nestjs-pino drops the error.
- every level object-first: rejected, it changes call sites that carry no error.

## Consequences

- Every other `warn`, `log`, and `debug` stays message-first.
- `logging.md` carries the rule.
