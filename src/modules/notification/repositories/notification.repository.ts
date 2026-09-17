import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { NotificationKindRules } from '@modules/notification/constants/notification.notify.constant';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationCreate,
    INotificationCreateEntry,
} from '@modules/notification/interfaces/notification.interface';
import type { INotificationRepository } from '@modules/notification/interfaces/notification.repository.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumNotificationChannel,
    Prisma,
} from '@generated/prisma-client/client';
import type { Notification } from '@generated/prisma-client/client';

@Injectable()
export class NotificationRepository implements INotificationRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperDateService: HelperDateService
    ) {}

    private buildCreateData(
        kind: EnumNotificationKind,
        { id, userId, metadata, createdBy }: INotificationCreate,
        today: Date
    ): Prisma.NotificationUncheckedCreateInput {
        const {
            type,
            priority,
            title,
            body,
            pendingChannels,
            deliveredChannels,
        } = NotificationKindRules[kind];

        return {
            id,
            type,
            title,
            body,
            userId,
            metadata,
            isRead: false,
            priority,
            createdBy,
            deliveries: {
                createMany: {
                    data: [
                        ...pendingChannels.map(channel => ({ channel })),
                        ...deliveredChannels.map(channel => ({
                            channel,
                            processedAt: today,
                            sentAt: today,
                        })),
                    ],
                },
            },
        };
    }

    async findWithPaginationCursor(
        userId: string,
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<Prisma.NotificationWhereInput>
    ): Promise<IResponsePagingReturn<Notification>> {
        return this.paginationService.cursor<
            Notification,
            Prisma.NotificationWhereInput
        >(this.databaseService.client.notification, {
            ...params,
            where: {
                ...where,
                userId,
            },
        });
    }

    async findIsReadById(
        userId: string,
        notificationId: string
    ): Promise<{ isRead: boolean } | null> {
        return this.databaseService.client.notification.findFirst({
            where: {
                id: notificationId,
                userId,
            },
            select: { isRead: true },
        });
    }

    async create(
        kind: EnumNotificationKind,
        payload: INotificationCreate
    ): Promise<Notification> {
        const today = this.helperDateService.create();

        return this.databaseService.client.notification.create({
            data: this.buildCreateData(kind, payload, today),
        });
    }

    async createMany(
        entries: INotificationCreateEntry[]
    ): Promise<Notification[]> {
        const today = this.helperDateService.create();

        return this.databaseService.client.$transaction(
            entries.map(({ kind, payload }) =>
                this.databaseService.client.notification.create({
                    data: this.buildCreateData(kind, payload, today),
                })
            )
        );
    }

    async markAsRead(
        userId: string,
        notificationId: string
    ): Promise<Notification> {
        return this.databaseService.client.notification.update({
            where: {
                id: notificationId,
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: this.helperDateService.create(),
            },
        });
    }

    async markAllAsRead(userId: string): Promise<Prisma.BatchPayload> {
        return this.databaseService.client.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: this.helperDateService.create(),
            },
        });
    }

    async updateProcessAt(
        userId: string,
        notificationId: string,
        channel: EnumNotificationChannel
    ): Promise<{ title: string; body: string } | null> {
        const today = this.helperDateService.create();
        return this.databaseService.client.notification.update({
            where: { id: notificationId, userId },
            data: {
                deliveries: {
                    update: {
                        where: {
                            notificationId_channel: {
                                notificationId,
                                channel,
                            },
                        },
                        data: {
                            processedAt: today,
                        },
                    },
                },
            },
            select: { title: true, body: true },
        });
    }

    async updateSentAt(
        userId: string,
        notificationId: string,
        channel: EnumNotificationChannel,
        failureTokens: string[]
    ): Promise<void> {
        const today = this.helperDateService.create();
        await this.databaseService.client.notification.update({
            where: { id: notificationId, userId },
            data: {
                deliveries: {
                    update: {
                        where: {
                            notificationId_channel: {
                                notificationId,
                                channel,
                            },
                        },
                        data: {
                            failureTokens,
                            sentAt: today,
                        },
                    },
                },
            },
        });
    }
}
