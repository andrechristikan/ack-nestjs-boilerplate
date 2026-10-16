import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    NotificationTermPolicyRecipientSendSelect,
    NotificationTermPolicyRecipientSendWhere,
    NotificationTermPolicyRecipientStateSelect,
} from '@modules/notification/constants/notification.constant';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationCreate,
    INotificationCreateEntry,
    INotificationTermPolicyRecipientCreate,
    INotificationTermPolicyRecipientState,
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
        { id, userId, metadata, createdBy, channels }: INotificationCreate,
        today: Date
    ): Prisma.NotificationUncheckedCreateInput {
        const {
            type,
            priority,
            title,
            body,
            pendingChannels,
            deliveredChannels,
        } = NotificationKindContract[kind];

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
                        ...pendingChannels
                            .filter(channel => channels.includes(channel))
                            .map(channel => ({ channel })),
                        ...deliveredChannels
                            .filter(channel => channels.includes(channel))
                            .map(channel => ({
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
    ): Promise<IResponsePaginationReturn<Notification>> {
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

    async createMany(
        entries: INotificationCreateEntry[]
    ): Promise<Notification[]> {
        const today = this.helperDateService.create();
        const ids = entries.map(({ payload }) => payload.id);

        return this.databaseService.withTransaction(async tx => {
            const existing = await tx.notification.findMany({
                where: { id: { in: ids } },
            });
            const existingIds = new Set(existing.map(row => row.id));
            const created: Notification[] = [];
            for (const { kind, payload } of entries) {
                if (existingIds.has(payload.id)) {
                    continue;
                }

                const createData = this.buildCreateData(kind, payload, today);
                const row = await tx.notification.create({
                    data: createData,
                });
                created.push(row);
            }

            return [...existing, ...created];
        });
    }

    async findTermPolicyRecipients(
        termPolicyId: string,
        userIds: string[]
    ): Promise<INotificationTermPolicyRecipientState[]> {
        return this.databaseService.client.termPolicyRecipient.findMany({
            where: { termPolicyId, userId: { in: userIds } },
            select: NotificationTermPolicyRecipientStateSelect,
        });
    }

    async findTermPolicyRecipientsSendableByBatchIds(
        termPolicyId: string,
        batchIds: string[]
    ): Promise<INotificationTermPolicyRecipientState[]> {
        return this.databaseService.client.termPolicyRecipient.findMany({
            where: {
                ...NotificationTermPolicyRecipientSendWhere,
                termPolicyId,
                batchId: { in: batchIds },
            },
            select: NotificationTermPolicyRecipientStateSelect,
            orderBy: { userId: EnumPaginationOrderDirectionType.asc },
        });
    }

    async createTermPolicyRecipients(
        proceedBy: string,
        termPolicyId: string,
        batchId: string,
        entries: INotificationCreateEntry[],
        recipients: INotificationTermPolicyRecipientCreate[]
    ): Promise<void> {
        const today = this.helperDateService.create();

        await this.databaseService.withTransaction(async tx => {
            for (const { kind, payload } of entries) {
                const createData = this.buildCreateData(kind, payload, today);
                await tx.notification.create({ data: createData });
            }

            await tx.termPolicyRecipient.createMany({
                data: recipients.map(({ userId, notificationId }) => ({
                    termPolicyId,
                    userId,
                    notificationId,
                    batchId,
                    sentAt: null,
                    claimedAt: null,
                    claimNonce: null,
                    createdBy: proceedBy,
                    updatedBy: proceedBy,
                })),
            });
        });
    }

    async claimTermPolicyRecipients(
        termPolicyId: string,
        batchId: string,
        userIds: string[],
        claimNonce: string,
        claimedAt: Date,
        updatedBy: string
    ): Promise<string[]> {
        await this.databaseService.client.termPolicyRecipient.updateMany({
            where: {
                ...NotificationTermPolicyRecipientSendWhere,
                termPolicyId,
                batchId,
                userId: { in: userIds },
            },
            data: { claimedAt, claimNonce, updatedBy },
        });

        const rows =
            await this.databaseService.client.termPolicyRecipient.findMany({
                where: { termPolicyId, batchId, claimNonce },
                select: NotificationTermPolicyRecipientSendSelect,
            });

        return rows.map(({ userId }) => userId);
    }

    async markTermPolicyRecipientsSent(
        claimNonce: string,
        userIds: string[],
        sentAt: Date,
        updatedBy: string
    ): Promise<void> {
        await this.databaseService.client.termPolicyRecipient.updateMany({
            where: { claimNonce, userId: { in: userIds }, sentAt: null },
            data: { sentAt, updatedBy },
        });
    }

    async releaseTermPolicyRecipients(
        claimNonce: string,
        userIds: string[],
        updatedBy: string
    ): Promise<void> {
        await this.databaseService.client.termPolicyRecipient.updateMany({
            where: { claimNonce, userId: { in: userIds }, sentAt: null },
            data: { claimedAt: null, claimNonce: null, updatedBy },
        });
    }

    async markAsRead(
        userId: string,
        notificationId: string
    ): Promise<Notification> {
        const readAt = this.helperDateService.create();

        return this.databaseService.client.notification.update({
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
    }

    async markAllAsRead(userId: string): Promise<Prisma.BatchPayload> {
        const readAt = this.helperDateService.create();

        return this.databaseService.client.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt,
            },
        });
    }

    async updateProcessAt(
        userId: string,
        notificationId: string,
        channel: EnumNotificationChannel
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
                            processedAt: today,
                        },
                    },
                },
            },
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
