# Queue Documentation

This documentation explains the features and usage of **Queue Module**: Located at `src/queues`

## Overview

Queue module for background job processing using [BullMQ][ref-bullmq] and [Redis][ref-redis]. This module implements a DRY design pattern with singleton Redis connections for efficient resource management.

All queue Redis connection settings live in `src/configs/redis.config.ts`. Job defaults (attempts, backoff, retention age) live in `src/configs/queue.config.ts`. The BullMQ framework layer (enums, decorator, base class, queue registration) lives in `src/queues`; the enqueue classes and the processors live in their owning feature module, and the router mounts the processors.

## Related Documents

- [Configuration][ref-doc-configuration]
- [Environment][ref-doc-environment]

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Configuration](#configuration)
- [Queue Structure](#queue-structure)
- [Available Queues](#available-queues)
- [Usage](#usage)
  - [Adding Jobs to Queue](#adding-jobs-to-queue)
  - [Job Options](#job-options)
- [Creating New Queue](#creating-new-queue)
- [Creating New Processor](#creating-new-processor)
- [QueueProcessorBase](#queueprocessorbase)
  - [Implementation](#implementation)
  - [Behavior](#behavior)
- [QueueException](#queueexception)
  - [Usage](#usage-1)
  - [Properties](#properties)
  - [Behavior](#behavior-1)
- [Bull Board Dashboard](#bull-board-dashboard)

## Configuration

Redis connection for queues is managed in `src/configs/redis.config.ts`:

```typescript
// the queue half of IConfigRedis; the other half is `cache`
queue: {
    url: string;
    namespace: string;
};
```

Job defaults (attempts, backoff delays, completed and failed retention age) are in `src/configs/queue.config.ts` and applied from `src/queues/queue.register.module.ts`.

Environment variables:
- `QUEUE_REDIS_URL`: Redis connection URL (default: `redis://localhost:6379/1`). Queues live on Redis database `1`; the cache uses database `0` through `CACHE_REDIS_URL`
- `APP_NAME`: Application name for connection naming
- `APP_ENV`: Application environment for connection naming

## Queue Structure

The queue system consists of:

1. **Queue Register Module** (`src/queues/queue.register.module.ts`): Global module for registering queues with default configurations
2. **Queue Processor Base** (`src/queues/bases/queue.processor.base.ts`): Base class with error handling and Sentry integration
3. **Queue Processor Decorator** (`src/queues/decorators/queue.decorator.ts`): Custom decorator for processor registration
4. **Queue Constants** (`src/queues/constants/queue.constant.ts`): `QueueConfigKey` and `QueueProcessorConfigKey`
5. **Queue Enums, Exception, Interface** (`src/queues/enums/queue.enum.ts`, `exceptions/queue.exception.ts`, `interfaces/queue.interface.ts`): `EnumQueue` and `EnumQueuePriority`, `QueueException`, `IQueueResponse`

**An enqueue lives in a queue class, never in a util or a service.** `<feature>/queues/<feature>[.<concern>].queue.ts` holds an `@Injectable()` class that injects the BullMQ `Queue` with `@InjectQueue`, and the feature's `<feature>.module.ts` both provides and exports it: `NotificationQueue`, `NotificationEmailQueue` and `NotificationPushQueue` from `NotificationModule`, `WorkspaceQueue` from `WorkspaceModule`. A caller in another module injects the exported class rather than the `Queue` itself.

Processors are not registered inside `src/queues`. Each one is a provider of its own feature's `<feature>.processor.module.ts` (`NotificationProcessorModule`, `WorkspaceProcessorModule`), and `RouterProcessorModule` (`src/router/processor/router.processor.module.ts`) imports every one of them. `RouterModule` imports `RouterProcessorModule` alongside the five HTTP route modules, so booting the API boots the workers in the same process.

Producers and workers do not share one connection. `queue.register.module.ts` calls `BullModule.forRootAsync` twice: once under `QueueConfigKey` for the producer side (connection name `{APP_NAME}-{APP_ENV}:queue`) and once under `QueueProcessorConfigKey` for the worker side (connection name `{APP_NAME}-{APP_ENV}:processor`). Both use `redis.queue.url` and the `Queue` prefix. Register a queue with `configKey: QueueConfigKey`; the `@QueueProcessor` decorator already binds `QueueProcessorConfigKey` for you.

## Available Queues

Currently available queues defined in `src/queues/enums/queue.enum.ts`:

- `EnumQueue.notification`: General notification processing queue
- `EnumQueue.notificationEmail`: Email notification processing queue
- `EnumQueue.notificationPush`: Push notification processing queue
- `EnumQueue.workspace`: Workspace background processing queue

Queue priorities defined in `EnumQueuePriority`:
- `high`: 1
- `medium`: 5
- `low`: 10

## Usage

### Adding Jobs to Queue

The queue class is the only place that holds a BullMQ `Queue`, and it exposes one method per job it enqueues:

```typescript
@Injectable()
export class NotificationPushQueue {
    private readonly dedupTtlInMs: number;

    constructor(
        @InjectQueue(EnumQueue.notificationPush)
        private readonly notificationPushQueue: Queue,
        private readonly configService: ConfigService
    ) {
        this.dedupTtlInMs = this.configService.get<number>(
            'notification.dedupTtlInMs'
        )!;
    }

    async sendNewDeviceLogin(
        sendPayload: INotificationSendPushPayload,
        data: INotificationNewDeviceLoginPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload<INotificationNewDeviceLoginPayload> =
            {
                send: sendPayload,
                data,
            };

        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.newDeviceLogin,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: `${EnumNotificationPushProcess.newDeviceLogin}-${sendPayload.userId}`,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }
}
```

A domain service that needs the job injects the queue class and calls that method:

```typescript
await this.notificationPushQueue.sendNewDeviceLogin(sendPayload, data);
```

### Job Options

Default job options come from `queue.config.ts` (interface `IConfigQueue`) and are applied by `queue.register.module.ts`. Retention is age-based: every queue shares `attempts: 3`, keeps a completed job for `removeOnCompleteAgeInSeconds` (7 days) and a failed one for `removeOnFailAgeInSeconds` (14 days), and they differ only in the exponential backoff `delay`:

| Queue | backoff delay |
|-------|---------------|
| `EnumQueue.notificationEmail` | `10000` |
| `EnumQueue.notificationPush` | `5000` |
| `EnumQueue.notification` | `3000` |
| `EnumQueue.workspace` | `10000` |

For example, the `notificationEmail` queue:

```typescript
{
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 10000,
    },
    removeOnComplete: { age: 604800 },
    removeOnFail: { age: 1209600 },
}
```

You can override these options when adding jobs to the queue.

## Creating New Queue

1. Add new queue enum in `src/queues/enums/queue.enum.ts`:

```typescript
export enum EnumQueue {
    notification = 'notification',
    notificationEmail = 'notificationEmail',
    notificationPush = 'notificationPush',
    workspace = 'workspace',
    yourQueue = 'yourQueue', // New queue
}
```

2. Add its backoff delay to `IConfigQueue` in `src/configs/queue.config.ts`:

```typescript
job: {
    // ... existing delays
    yourQueueBackoffDelayInMs: ms('5s'),
}
```

3. Register the queue in `src/queues/queue.register.module.ts`, reading every job default from config like the existing queues:

```typescript
static forRoot(): DynamicModule {
    const queues = [
        // ... existing queues
        BullModule.registerQueueAsync({
            name: EnumQueue.yourQueue,
            configKey: QueueConfigKey,
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                defaultJobOptions: {
                    attempts: configService.get<number>('queue.job.attempts'),
                    backoff: {
                        type: 'exponential',
                        delay: configService.get<number>(
                            'queue.job.yourQueueBackoffDelayInMs'
                        ),
                    },
                    removeOnComplete: {
                        age: configService.get<number>(
                            'queue.job.removeOnCompleteAgeInSeconds'
                        )!,
                    },
                    removeOnFail: {
                        age: configService.get<number>(
                            'queue.job.removeOnFailAgeInSeconds'
                        )!,
                    },
                },
            }),
        }),
    ];
    // ...
}
```

4. Add the enqueue class in `src/modules/<feature>/queues/`, and provide plus export it from the feature's `<feature>.module.ts`:

```typescript
@Injectable()
export class YourFeatureQueue {
    constructor(
        @InjectQueue(EnumQueue.yourQueue)
        private readonly yourQueue: Queue
    ) {}

    async sendSomething(data: IYourQueuePayload): Promise<void> {
        await this.yourQueue.add(EnumYourProcess.something, data, {
            priority: EnumQueuePriority.medium,
        });
    }
}
```

## Creating New Processor

1. Create the processor class inside its owning feature module, under `src/modules/<feature>/processors/`, extending `QueueProcessorBase`:

```typescript
@QueueProcessor(EnumQueue.notificationPush)
export class NotificationPushProcessor extends QueueProcessorBase {
    private readonly logger = new Logger(NotificationPushProcessor.name);

    constructor(
        private readonly notificationPushProcessorService: NotificationPushProcessorService
    ) {
        super();
    }

    async process(
        job: Job<unknown, IQueueResponse, EnumNotificationPushProcess>
    ): Promise<IQueueResponse> {
        try {
            switch (job.name) {
                case EnumNotificationPushProcess.newDeviceLogin:
                    return this.notificationPushProcessorService.processNewDeviceLogin(
                        job as Job<INotificationPushQueuePayload, IQueueResponse>
                    );
                default:
                    return { message: `No processor found for job ${job.name}` };
            }
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to process notification push job');
            throw error;
        }
    }
}
```

The second argument of `@QueueProcessor` is `IQueueProcessorOptions`, a BullMQ `WorkerOptions` minus `name` and `connection` (the decorator owns the first, the shared Redis connection the second), so a worker that needs its own throughput ceiling passes one: `NotificationPushProcessor` sets `limiter` from the Firebase send-quota constants. The worker name itself is derived by the decorator as `{APP_NAME}-{APP_ENV}:{queue}:consumer`, read from `process.env` at decoration time.

2. Register the processor and its processor service in the feature's own `<feature>.processor.module.ts`:

```typescript
@Module({
    controllers: [],
    providers: [
        NotificationProcessor,
        NotificationEmailProcessor,
        NotificationPushProcessor,
        NotificationProcessorService,
        NotificationEmailProcessorService,
        NotificationPushProcessorService,
        YourNewProcessor, // Add processor
    ],
    exports: [],
    imports: [],
})
export class NotificationProcessorModule {}
```

3. For a feature that has no processor module yet, create one and add it to `RouterProcessorModule`:

```typescript
@Module({
    imports: [
        NotificationProcessorModule,
        WorkspaceProcessorModule,
        YourFeatureProcessorModule, // Add module
    ],
})
export class RouterProcessorModule {}
```

A processor module imports whatever its processor services depend on: `WorkspaceProcessorModule` imports `WorkspaceModule`, while `NotificationProcessorModule` needs no imports because everything it injects is global.

## QueueProcessorBase

`QueueProcessorBase` is the base class for all queue processors, extending `WorkerHost` from BullMQ with additional error handling, Sentry integration for monitoring fatal errors, retry logic support, and automatic failed job event handling.

### Implementation

Location: `src/queues/bases/queue.processor.base.ts`

```typescript
export abstract class QueueProcessorBase extends WorkerHost {
    @OnWorkerEvent('failed')
    onFailed(job: Job<unknown, null, string>, error: Error): void {
        const maxAttempts = job.opts.attempts ?? 1;
        const isLastAttempt = job.attemptsMade >= maxAttempts - 1;

        if (isLastAttempt) {
            let isFatal = true;

            if (error instanceof QueueException) {
                isFatal = !!error.isFatal;
            }

            if (isFatal) {
                try {
                    Sentry.captureException(error);
                } catch (_) {}
            }
        }
    }

    abstract process(job: Job): Promise<IQueueResponse>;
}
```

### Behavior

1. **On Job Failure**: The `onFailed` method is automatically triggered
2. **Retry Check**: Determines if this is the last retry attempt
3. **Error Classification**:
   - `QueueException` with `isFatal: true` → Reports to Sentry
   - `QueueException` with `isFatal: false` → Does not report to Sentry
   - Other exceptions → Reports to Sentry (treated as fatal)
4. **Sentry Reporting**: Only reports on the final retry attempt to avoid duplicate alerts

## QueueException

`QueueException` is a custom exception class for queue error handling with Sentry integration control.

### Usage

```typescript
// Fatal error - will be reported to Sentry on last retry
throw new QueueException('Critical payment processing failed', true);

// Non-fatal error - will not be reported to Sentry
throw new QueueException('Temporary service unavailable', false);

// Default behavior (non-fatal)
throw new QueueException('Minor validation error');
```

### Properties

- `message`: Error message
- `isFatal`: Boolean flag to control Sentry reporting (default: `false`)

### Behavior

When a job fails:
1. The `QueueProcessorBase` catches the error
2. On the last retry attempt:
   - If error is `QueueException` with `isFatal: true` → Reports to Sentry
   - If error is `QueueException` with `isFatal: false` → Does not report to Sentry
   - If error is any other exception → Reports to Sentry (treated as fatal)
3. On non-last retry attempts → Never reports to Sentry

## Bull Board Dashboard

ACK NestJS Boilerplate includes Bull Board for queue monitoring and management.

Access the dashboard:
```bash
docker-compose up
```

Dashboard URL: `http://localhost:3010`

Default credentials:
- Username: `admin`
- Password: `admin123`

Configuration in `docker-compose.yml`:
```yaml
redis-bullboard:
    image: venatum/bull-board:latest
    ports:
        - 3010:3000
    environment:
        - REDIS_HOST=redis
        - REDIS_PORT=6379
        - BULL_PREFIX=Queue
        - USER_LOGIN=admin
        - USER_PASSWORD=admin123
        - REDIS_DB=1
```




<!-- REFERENCES -->

[ref-bullmq]: https://bullmq.io
[ref-redis]: https://redis.io

[ref-doc-configuration]: configuration.md
[ref-doc-environment]: environment.md
