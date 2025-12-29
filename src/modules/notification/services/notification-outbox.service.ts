import { HelperService } from '@common/helper/services/helper.service';
import { NotificationOutboxJobDto } from '@modules/notification/dtos/notification.outbox-job.dto';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { INotificationOutboxPayload } from '@modules/notification/interfaces/notification.outbox.interface';
import { NotificationOutboxRepository } from '@modules/notification/repositories/notification-outbox.repository';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import {
    NotificationOutboxDispatchIntervalMs,
    NotificationOutboxFanoutChunkSize,
    NotificationOutboxInsertBatchSize,
    NotificationOutboxMaxAttempts,
    NotificationOutboxPendingBatchSize,
    NotificationOutboxRetryDelayMs,
} from '@modules/notification/constants/notification.constant';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
    EnumOutboxEventType,
    EnumOutboxStatus,
    OutboxEvent,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { EnumQueue, EnumQueuePriority } from 'src/queues/enums/queue.enum';

@Injectable()
export class NotificationOutboxService implements OnModuleInit {
    private readonly logger = new Logger(NotificationOutboxService.name);

    constructor(
        private readonly notificationOutboxRepository: NotificationOutboxRepository,
        private readonly notificationRepository: NotificationRepository,
        private readonly helperService: HelperService,
        @InjectQueue(EnumQueue.NOTIFICATION)
        private readonly notificationQueue: Queue
    ) {}

    async onModuleInit(): Promise<void> {
        await this.ensureDispatchJob();
    }

    async ensureDispatchJob(): Promise<void> {
        try {
            await this.notificationQueue.add(
                EnumNotificationProcess.outboxDispatch,
                {},
                {
                    jobId: EnumNotificationProcess.outboxDispatch,
                    repeat: { every: NotificationOutboxDispatchIntervalMs },
                    attempts: 1,
                    priority: EnumQueuePriority.LOW,
                }
            );
        } catch (error: unknown) {
            this.logger.error(error);
        }
    }

    async enqueueFanout(
        payload: INotificationOutboxPayload
    ): Promise<void> {
        const uniqueUserIds = this.helperService.arrayUnique(
            payload.userIds ?? []
        );
        if (uniqueUserIds.length === 0) {
            return;
        }

        const chunks = this.helperService.arrayChunk(
            uniqueUserIds,
            NotificationOutboxFanoutChunkSize
        );

        for (const chunk of chunks) {
            const event = await this.notificationOutboxRepository.create(
                EnumOutboxEventType.notificationFanout,
                {
                    ...payload,
                    userIds: chunk,
                },
                payload.createdBy
            );

            await this.enqueueHandleJob({
                outboxId: event.id,
            });
        }
    }

    async dispatchPending(): Promise<void> {
        const now = this.helperService.dateCreate();
        const pending = await this.notificationOutboxRepository.findPending(
            NotificationOutboxPendingBatchSize,
            now
        );

        await Promise.all(
            pending.map(event =>
                this.enqueueHandleJob({ outboxId: event.id })
            )
        );
    }

    async handleOutbox(outboxId: string): Promise<void> {
        const now = this.helperService.dateCreate();
        const canProcess = await this.notificationOutboxRepository.markProcessing(
            outboxId,
            now
        );
        if (!canProcess) {
            return;
        }

        const event = await this.notificationOutboxRepository.findById(outboxId);
        if (!event) {
            return;
        }

        try {
            switch (event.type) {
                case EnumOutboxEventType.notificationFanout:
                    await this.handleNotificationFanout(event);
                    break;
                default:
                    break;
            }

            await this.notificationOutboxRepository.markProcessed(
                event.id,
                now
            );
        } catch (error: unknown) {
            await this.handleOutboxFailure(event, error as Error);
        }
    }

    private async enqueueHandleJob(
        job: NotificationOutboxJobDto
    ): Promise<void> {
        await this.notificationQueue.add(
            EnumNotificationProcess.outboxHandle,
            job,
            {
                jobId: `${EnumNotificationProcess.outboxHandle}-${job.outboxId}`,
                attempts: 1,
                priority: EnumQueuePriority.MEDIUM,
            }
        );
    }

    private async handleNotificationFanout(
        event: OutboxEvent
    ): Promise<void> {
        const payload = event.payload as unknown as INotificationOutboxPayload;
        if (!payload?.userIds?.length) {
            return;
        }

        const chunks = this.helperService.arrayChunk(
            payload.userIds,
            NotificationOutboxInsertBatchSize
        );

        for (const chunk of chunks) {
            await this.notificationRepository.createMany(
                chunk,
                payload.type,
                payload.title,
                payload.body,
                payload.data,
                payload.createdBy
            );
        }
    }

    private async handleOutboxFailure(
        event: OutboxEvent,
        error: Error
    ): Promise<void> {
        this.logger.error(error);
        const attempts = event.attempts ?? 0;
        if (attempts >= NotificationOutboxMaxAttempts) {
            await this.notificationOutboxRepository.markFailed(
                event.id,
                EnumOutboxStatus.failed,
                error
            );
            return;
        }

        const delay =
            NotificationOutboxRetryDelayMs * Math.max(attempts, 1);
        const nextRunAt = this.helperService.dateForward(
            this.helperService.dateCreate(),
            this.helperService.dateCreateDuration({
                milliseconds: delay,
            })
        );

        await this.notificationOutboxRepository.markFailed(
            event.id,
            EnumOutboxStatus.pending,
            error,
            nextRunAt
        );
    }
}
