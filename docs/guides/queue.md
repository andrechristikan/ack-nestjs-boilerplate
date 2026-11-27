---
title: Queue Guide
description: Add a queue, its queue class, a processor, and a use case, or add a job and its outbox effect to an existing queue.
---

# Queue Guide

This guide shows how to add background work to a feature module, for a developer who knows how the outbox and BullMQ fit together. The `workspace` queue (two scheduled jobs and one effect, `softDelete`) and the `notificationEmail` queue (many jobs, encrypted fields, a rate limiter) are the references. An effect builder is named `<action>Effect` (`WorkspaceQueue.softDeleteEffect`), and a builder named for its action instead, such as `NotificationQueue.notify`, is the same kind of method.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Queue][ref-doc-concept-queue]: the outbox, the dispatch after the commit, and retries
- [Queue Reference][ref-doc-reference-queue]: the existing queues, jobs, id patterns, and options
- [Module Guide][ref-doc-guide-module]: the module the queue belongs to
- [I18n Guide][ref-doc-guide-i18n]: the queue messages
- [Configuration Reference][ref-doc-reference-configuration-queue]: the `queue` keys

## Prerequisites

- The feature module exists ([Module Guide][ref-doc-guide-module]).
- The work is a side effect of a write, a recurring job, or a job a route hands its whole action to. A flow never leaves part of its own writes to a queued job.
- The job's handler is idempotent, because a retry or an operator re-run repeats it.

## Steps

### Add a queue

1. Name the queue. Add a member to `Enum<Module>Queue` in `src/modules/<module>/enums/<module>.enum.ts`. Its value is the Redis queue name (`EnumWorkspaceQueue` in `src/modules/workspace/enums/workspace.enum.ts`).
2. Add the backoff to config. Add `<name>BackoffDelayInMs` to `IConfigQueue` and its value in `src/configs/queue.config.ts`, where `<name>` is the queue's short name (`workspace` gives `workspaceBackoffDelayInMs`). The attempts, the log count, and the removal ages are shared keys.
3. Write the queue factory in `src/modules/<module>/factories/<module>[.<concern>].queue.factory.ts`. The class implements `RegisterQueueOptionsFactory` and returns `defaultJobOptions` from the shared keys and its own backoff (`src/modules/workspace/factories/workspace.queue.factory.ts`):

    ```typescript
    return {
        defaultJobOptions: {
            attempts: maxAttempts,
            keepLogs,
            backoff: {
                type: 'exponential',
                delay: backoffDelayInMs,
            },
            removeOnComplete: {
                age: removeOnCompleteAgeInSeconds,
            },
            removeOnFail: {
                age: removeOnFailAgeInSeconds,
            },
        },
    };
    ```

4. Register the queue and provide its queue class in `<module>.module.ts`. Provide the class again under the queue's enum value, and export the class (`src/modules/workspace/workspace.module.ts`):

    ```typescript
    WorkspaceQueue,
    {
        provide: EnumWorkspaceQueue.workspace,
        useExisting: WorkspaceQueue,
    },
    ```

    ```typescript
    BullModule.registerQueueAsync({
        name: EnumWorkspaceQueue.workspace,
        useClass: WorkspaceQueueFactory,
    }),
    ```

    The first block goes in `providers`, the second in `imports`. The `useExisting` provider is the token the outbox uses to find the queue class.

5. Write the queue class in `queues/<module>[.<concern>].queue.ts`. It is `@Injectable()`, extends `QueueBase`, and injects the BullMQ queue with `@InjectQueue(Enum<Module>Queue.<member>) protected override readonly queue: Queue`, then calls `super(queue)`. Inject `ConfigService` only when it reads a key (`src/modules/workspace/queues/workspace.queue.ts`).
6. Write the processor in `processors/<module>[.<concern>].processor.ts`. It carries `@QueueProcessor(Enum<Module>Queue.<member>)`, extends `QueueProcessorBase`, takes its feature's use cases in the constructor, and calls `super()`. `handle(job, data, outboxId)` switches on `job.name`, awaits one use case's `execute` per case, and ends with the `default` case that calls `throwUnknownProcess`. A worker option such as a limiter goes in the decorator's second argument (`src/modules/notification/processors/notification.email.processor.ts`). `data` is the `data` of the job's outbox row, or `job.data` for a scheduler tick. This is `src/modules/workspace/processors/workspace.processor.ts`:

    ```typescript
    protected async handle(
        job: Job<unknown, IQueueResponse, EnumWorkspaceProcess>,
        data: unknown
    ): Promise<IQueueResponse> {
        switch (job.name) {
            case EnumWorkspaceProcess.expireStaleInvites:
                return await this.workspaceProcessExpireStaleInvitesUseCase.execute();
            case EnumWorkspaceProcess.softDelete:
                return await this.workspaceProcessSoftDeleteUseCase.execute(
                    data as IWorkspaceSoftDeletePayload
                );
            default:
                this.throwUnknownProcess(
                    'workspace.queue.error.unknownProcess',
                    job.name
                );
        }
    }
    ```

7. Write one use case per job in `use-cases/<module>[.<concern>].process-<action>.use-case.ts`. The class is `<Module>[<Concern>]Process<Action>UseCase`, implements `IAppUseCase<[...], IQueueResponse>`, runs the whole job as one flow, and returns an `IQueueResponse` whose `message` is `setMessage('<module>.queue.<process>', { properties })`. `properties` fills the placeholders of the message. A failure no retry can fix throws `QueueUnrecoverableException`, and any other failure throws `QueueException`. `isFatal` decides only the Sentry report: `true` reports the failure, and `false` keeps it out of Sentry. Retries run either way. `QueueUnrecoverableException` defaults to `true` and `QueueException` to `false` (`src/modules/workspace/use-cases/workspace.process-expire-stale-invites.use-case.ts`).
8. Provide and export the use cases in `<module>.use-case.module.ts`, and inject each into the processor's constructor.
9. Register the processor. Add it to `providers` and the use-case module to `imports` of `src/router/processor/router.processor.module.ts`.
10. Add the messages `<module>.queue.<process>` and `<module>.queue.error.unknownProcess` to `src/languages/<lang>/<module>.json`, one file per language ([I18n Guide][ref-doc-guide-i18n]).

### Add a job to an existing queue

1. Add the job name to the module's process enum, `Enum<Module>Process` (`EnumWorkspaceProcess`).
2. Declare the payload in `interfaces/<module>.interface.ts` with camelCase fields, as `I<Module><Action>Payload`. The effect's `data` is that payload itself (`IWorkspaceSoftDeletePayload`). Only a job that fans out to a batch of recipients wraps its payload in an envelope, `I<Module>[<Channel>][Bulk]QueuePayload<T>`, where `<Channel>` is the notification channel and `Bulk` marks a batch (`INotificationEmailBulkQueuePayload<T>` holds `data`, `batchId`, `proceedBy`, and `recipients`).
3. Write the producer:
    - A side effect of a write is an outbox effect. Declare `I<Module><Action>Effect extends IOutboxEffect` in the interface file, with literal `queue` and `name` and the payload as `data`, and add an `<action>Effect` method to the queue class that returns it with its `priority` and `idempotencyKey` (`WorkspaceQueue.softDeleteEffect`). An `idempotencyKey` of `null` makes every effect its own job.
    - A job a route hands its whole action to is an effect too. The route's use case adds the effect to its transaction, and the writes of the action run in the job's use case (`WorkspaceSoftDeleteUseCase` adds `softDeleteEffect`, and `WorkspaceProcessSoftDeleteUseCase` does the work).
    - A recurring job is an entry in the queue class's `schedulers()` instead. An entry holds an `id`, `repeat` options, and a `template` with the job `name`, `data`, and `opts`. `WorkspaceQueue` declares one entry per scheduled job (`src/modules/workspace/queues/workspace.queue.ts`):

        ```typescript
        protected override schedulers(): IQueueScheduler[] {
            return [
                EnumWorkspaceProcess.expireStaleInvites,
                EnumWorkspaceProcess.expireStaleJoinRequests,
            ].map(jobName => ({
                id: jobName,
                repeat: {
                    pattern: this.expirySweepCron,
                    tz: this.timezone,
                    immediately: true,
                },
                template: {
                    name: jobName,
                    data: {},
                    opts: { priority: EnumQueuePriority.low },
                },
            }));
        }
        ```

        The base class returns an empty list, so only a queue class with a recurring job declares `schedulers()`: `OutboxQueue`, `NotificationPushQueue`, `WorkspaceQueue`, `UserAuthQueue`, and `AnalyticQueue`.

    - A payload that holds a sensitive field encrypts it in the effect builder (`NotificationQueue.notify`, the builder of the `notification` queue).
4. Add one `case` to the processor's `handle` that awaits the new use case.
5. Write the use case as in step 7 above, and add its messages.
6. Add the effect in the caller's transaction. The use case injects the owning queue class, `DatabaseService`, and `OutboxService`, and calls `addInTx` inside `withTransaction` (`src/modules/workspace/use-cases/workspace.soft-delete.use-case.ts`):

    ```typescript
    const effect = this.workspaceQueue.softDeleteEffect(
        workspaceContext.workspace.id,
        authContext.userId,
        activityLog
    );
    const outboxId = await this.databaseService.withTransaction(async tx =>
        this.outboxService.addInTx(tx, effect)
    );
    ```

    The caller does nothing after the commit: the outbox dispatches the row ([Queue][ref-doc-concept-queue-outbox]). A caller in another module injects the owning module's queue class. A flow that adds several effects passes them to one `addManyInTx`.

## Check the result

1. Run the type check and the unit specs of the module:

    ```bash
    pnpm typecheck
    pnpm test <module>
    ```

    An effect builder spec asserts the queue, name, data, priority, and key. A job use case spec asserts the service calls it makes and the message it returns.

2. Boot the application with `pnpm start:dev`. The boot log lists `<Module>UseCaseModule dependencies initialized`, and BullMQ logs nothing per worker.
3. Trigger the action, or wait for the scheduler tick, and open BullBoard at `http://localhost:3010`. BullBoard starts with the compose `deps` profile, not with `pnpm start:dev`, and asks for `DOCKER_BULLBOARD_USERNAME` and `DOCKER_BULLBOARD_PASSWORD` (`admin` and `admin123` by default). The queue appears with its job, and the job completes.
4. The `Outboxes` row of the effect reaches `completed`. A scheduled job has no outbox row, so this check does not apply to it.

## Related tasks

- [Module Guide][ref-doc-guide-module]: create the module the queue belongs to
- [Status Code Guide][ref-doc-guide-status-code]: add the exception a use case throws
- [File Upload Guide][ref-doc-guide-file-upload]: delete a replaced S3 object through an outbox row

<!-- REFERENCES -->

[ref-doc-concept-queue]: ../concepts/queue.md
[ref-doc-concept-queue-outbox]: ../concepts/queue.md#outbox-row-in-the-transaction
[ref-doc-reference-queue]: ../reference/queue.md
[ref-doc-guide-module]: module.md
[ref-doc-guide-i18n]: i18n.md
[ref-doc-guide-status-code]: status-code.md
[ref-doc-guide-file-upload]: file-upload.md
[ref-doc-reference-configuration-queue]: ../reference/configuration.md#queue
