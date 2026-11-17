---
paths:
    - 'src/**'
---

# Injectable classes and config

## NestJS idiomatic

Hand-rolling what Nest provides is a defect: no service locator, no manual `new` of an injectable, no bare `@UseGuards` where a `@<Feature>Protected()` exists. Exceptions: `ClsServiceManager.getClsService()` in a `createParamDecorator` factory, and the per-class `new Logger(ClassName.name)` (Logger).

An outbound HTTP call goes through `HttpClient` from `@nestjs/http-client`, never global `fetch`, `axios`, or `@nestjs/axios`; every client sets `redirect: 'error'` and a `timeout`.

## Constructors and fields

- Every constructor parameter is a parameter property, never plain, never `public`; `QueueWorkerBase` alone takes plain parameters, because BullMQ's `Worker` holds public `name` and `opts` and `@nestjs/bullmq` constructs it positionally. `QueueProcessorBase` alone takes property injection, `@Inject(<Class>) protected readonly <field>: <Class>` for its four kit services, so a processor's constructor holds only its use cases.
- In an exception (`*.exception.ts`), each is bare `readonly` (`constructor(readonly period: number)`, `readonly rawError: unknown = null`).
- Elsewhere, `private readonly` by default; `protected readonly` for a value forwarded to `super(...)` or a member a subclass reads (`queue` and `cacheService` on a `QueueBase` subclass, `options`, `storageService`, and `reflector` on `RequestThrottleDefaultGuard`, `configService` on the two JWT strategies). A bare `readonly` parameter appears only in an exception.
- Values forwarded to `super(...)` come first, in `super`'s order, then the injected collaborators.
- A field assigned in the constructor is `private readonly`; one another class reads is a `readonly` field, never a parameter property (`DatabaseService.client`).
- The one mutable field is a third-party client an `onModuleInit` adapter creates: `AwsS3Service.s3Client`, `AwsSESService.sesClient`, `FirebaseService.app`, `FirebaseService.messaging`; and the static `QueueWorkerBase.connection`, which `QueueWorkerFactory` sets.

## Logger

- One `private readonly logger = new Logger(ClassName.name)` per class, never module-level; `error`, a `warn` that carries a caught error, and a line that carries fields are object-first (`this.logger.error(error, 'context')`, `this.logger.warn({ key, err: error }, 'context')`, `this.logger.warn({ statusCode }, 'context')`; the reverse drops the stack and the object), the rest message-first.

## Config

- Outside `src/configs/` and `src/instrument.ts`, code reads `ConfigService.get<T>('namespace.key')`, `T` named, once into a `private readonly` constructor field. A module `useFactory`, a queue options factory, `bootstrap.ts`, `configure.ts`, and `swagger.ts` read where they build.
- A field or a local holding a config value takes its name from the path, and no other word:
    - the last segment, whole (`cacheTtlInMs` for `auth.xApiKey.cacheTtlInMs`);
    - an earlier segment only where two fields of the class would share a name, or the bare name is a reserved word or reads as another thing (`s3Public` for `aws.s3.public`, `throttleUser` for `request.throttle.user`);
    - a leading word of the last segment drops only when it repeats the class name (`backoffDelayInMs` for `queue.job.emailBackoffDelayInMs` in `NotificationEmailQueueFactory`).
- A TTL, an outbound HTTP timeout, a retry or backoff count, size threshold, chunk size, rollout percent, sample rate, cron pattern, rate limit, unique-value retry budget (`*MaxAttempts`), or idempotency key pattern (`<namespace>.idempotencyKey.<name>Pattern`, `effects.md`) is a camelCase config key, never a literal or bare `const` outside `src/configs/`; a value a library fixes, or one read at decoration time, at schema-definition time, or before Nest exists, is a constant (`config.md`, Layers). A password or MFA attempt budget and its lock duration are flag metadata (`feature-flag.md`, Metadata).
