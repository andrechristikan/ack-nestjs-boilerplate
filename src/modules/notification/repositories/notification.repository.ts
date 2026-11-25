import { DatabaseService } from '@common/database/services/database.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { NotificationRefSelect } from '@modules/notification/constants/notification.constant';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationCreate,
    INotificationCreateEntry,
    INotificationReadState,
} from '@modules/notification/interfaces/notification.interface';
import type { INotificationRepository } from '@modules/notification/interfaces/notification.repository.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumNotificationChannel,
    EnumNotificationType,
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

    private buildNotificationRow(
        kind: EnumNotificationKind,
        { id, userId, metadata, createdBy }: INotificationCreate
    ): Prisma.NotificationCreateManyInput {
        const { type, priority, title, body } = NotificationKindContract[kind];

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
        };
    }

    private buildDeliveryRows(
        kind: EnumNotificationKind,
        { createdBy, channels }: INotificationCreate,
        today: Date
    ): Prisma.NotificationDeliveryCreateManyNotificationInput[] {
        const { pendingChannels, deliveredChannels } =
            NotificationKindContract[kind];
        const selected = new Set(channels);

        return [
            ...pendingChannels
                .filter(channel => selected.has(channel))
                .map(channel => ({
                    channel,
                    processedAt: null,
                    sentAt: null,
                    createdBy,
                })),
            ...deliveredChannels
                .filter(channel => selected.has(channel))
                .map(channel => ({
                    channel,
                    processedAt: today,
                    sentAt: today,
                    createdBy,
                })),
        ];
    }

    private buildVisibleWhere(
        userId: string,
        excludedTypes: EnumNotificationType[]
    ): Prisma.NotificationWhereInput {
        return {
            userId,
            deliveries: {
                some: { channel: EnumNotificationChannel.inApp },
            },
            ...(excludedTypes.length > 0 && {
                type: { notIn: excludedTypes },
            }),
        };
    }

    async findWithPaginationCursor(
        userId: string,
        { where, ...params }: IPaginationQueryCursorParams,
        excludedTypes: EnumNotificationType[]
    ): Promise<IResponsePaginationReturn<Notification>> {
        const visibleWhere = this.buildVisibleWhere(userId, excludedTypes);

        return this.paginationService.cursor(
            this.databaseService.client.notification,
            {
                ...params,
                where: {
                    ...where,
                    ...visibleWhere,
                },
            }
        );
    }

    async findIsReadById(
        userId: string,
        notificationId: string
    ): Promise<INotificationReadState | null> {
        return this.databaseService.client.notification.findFirst({
            where: {
                id: notificationId,
                userId,
            },
            select: NotificationRefSelect,
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        kind: EnumNotificationKind,
        payload: INotificationCreate
    ): Promise<void> {
        const today = this.helperDateService.now();
        const notification = this.buildNotificationRow(kind, payload);
        const deliveries = this.buildDeliveryRows(kind, payload, today);
        await tx.notification.create({
            data: {
                ...notification,
                deliveries: { createMany: { data: deliveries } },
            },
        });
    }

    async createIfAbsentInTx(
        tx: IDatabaseTransactionClient,
        kind: EnumNotificationKind,
        payload: INotificationCreate
    ): Promise<void> {
        const existing = await tx.notification.findUnique({
            where: { id: payload.id },
            select: NotificationRefSelect,
        });
        if (existing) {
            return;
        }

        await this.createInTx(tx, kind, payload);
    }

    async createManyInTx(
        tx: IDatabaseTransactionClient,
        entries: INotificationCreateEntry[]
    ): Promise<void> {
        if (entries.length === 0) {
            return;
        }

        const today = this.helperDateService.now();
        const notifications = entries.map(({ kind, payload }) => {
            const row = this.buildNotificationRow(kind, payload);

            return row;
        });
        const deliveries = entries.flatMap(({ kind, payload }) => {
            const rows = this.buildDeliveryRows(kind, payload, today);

            return rows.map(row => ({ ...row, notificationId: payload.id }));
        });

        await Promise.all([
            tx.notification.createMany({ data: notifications }),
            tx.notificationDelivery.createMany({ data: deliveries }),
        ]);
    }

    async markEmailSentInTx(
        tx: IDatabaseTransactionClient,
        notificationIds: string[],
        sentAt: Date,
        updatedBy: string
    ): Promise<void> {
        await tx.notificationDelivery.updateMany({
            where: {
                notificationId: { in: notificationIds },
                channel: EnumNotificationChannel.email,
                sentAt: null,
            },
            data: { processedAt: sentAt, sentAt, updatedBy },
        });
    }

    async markAsRead(notificationId: string, userId: string): Promise<boolean> {
        const readAt = this.helperDateService.now();
        const { count } =
            await this.databaseService.client.notification.updateMany({
                where: {
                    id: notificationId,
                    userId,
                    isRead: false,
                },
                data: {
                    isRead: true,
                    readAt,
                },
            });

        return count > 0;
    }

    async markAllAsRead(
        userId: string,
        excludedTypes: EnumNotificationType[]
    ): Promise<number> {
        const readAt = this.helperDateService.now();
        const visibleWhere = this.buildVisibleWhere(userId, excludedTypes);
        const { count } =
            await this.databaseService.client.notification.updateMany({
                where: {
                    ...visibleWhere,
                    isRead: false,
                },
                data: {
                    isRead: true,
                    readAt,
                },
            });

        return count;
    }

    async updateDeliveryProcessedAt(
        notificationId: string,
        channel: EnumNotificationChannel,
        at: Date,
        updatedBy: string
    ): Promise<boolean> {
        const { count } =
            await this.databaseService.client.notificationDelivery.updateMany({
                where: { notificationId, channel },
                data: { processedAt: at, updatedBy },
            });

        return count > 0;
    }

    async updateDeliverySentAt(
        notificationId: string,
        channel: EnumNotificationChannel,
        at: Date,
        failureTokens: string[],
        updatedBy: string
    ): Promise<boolean> {
        const { count } =
            await this.databaseService.client.notificationDelivery.updateMany({
                where: { notificationId, channel },
                data: { failureTokens, sentAt: at, updatedBy },
            });

        return count > 0;
    }

    async updateDeliverySentAtInTx(
        tx: IDatabaseTransactionClient,
        notificationId: string,
        channel: EnumNotificationChannel,
        at: Date,
        failureTokens: string[],
        updatedBy: string
    ): Promise<boolean> {
        const { count } = await tx.notificationDelivery.updateMany({
            where: { notificationId, channel },
            data: { failureTokens, sentAt: at, updatedBy },
        });

        return count > 0;
    }
}
