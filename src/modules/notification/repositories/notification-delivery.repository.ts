import { DatabaseService } from '@common/database/services/database.service';
import { Injectable } from '@nestjs/common';
import {
    EnumDeliveryStatus,
    EnumNotificationChannel,
    NotificationDelivery,
} from '@prisma/client';

@Injectable()
export class NotificationDeliveryRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async create(
        notificationId: string,
        channel: EnumNotificationChannel
    ): Promise<NotificationDelivery> {
        return this.databaseService.notificationDelivery.create({
            data: {
                notificationId,
                channel,
                status: EnumDeliveryStatus.pending,
            },
        });
    }

    async createMany(
        notificationId: string,
        channels: EnumNotificationChannel[]
    ): Promise<number> {
        const result = await this.databaseService.notificationDelivery.createMany({
            data: channels.map(channel => ({
                notificationId,
                channel,
                status: EnumDeliveryStatus.pending,
            })),
        });
        return result.count;
    }

    async updateStatus(
        id: string,
        status: EnumDeliveryStatus,
        failedReason?: string
    ): Promise<NotificationDelivery> {
        const now = new Date();
        return this.databaseService.notificationDelivery.update({
            where: { id },
            data: {
                status,
                attemptCount: { increment: 1 },
                lastAttemptAt: now,
                deliveredAt: status === EnumDeliveryStatus.delivered ? now : undefined,
                failedReason: failedReason ?? null,
            },
        });
    }

    async markSent(id: string): Promise<NotificationDelivery> {
        return this.updateStatus(id, EnumDeliveryStatus.sent);
    }

    async markDelivered(id: string): Promise<NotificationDelivery> {
        return this.updateStatus(id, EnumDeliveryStatus.delivered);
    }

    async markFailed(id: string, reason: string): Promise<NotificationDelivery> {
        return this.updateStatus(id, EnumDeliveryStatus.failed, reason);
    }

    async findByNotificationId(
        notificationId: string
    ): Promise<NotificationDelivery[]> {
        return this.databaseService.notificationDelivery.findMany({
            where: { notificationId },
        });
    }

    async findPendingByChannel(
        channel: EnumNotificationChannel,
        limit: number = 100
    ): Promise<NotificationDelivery[]> {
        return this.databaseService.notificationDelivery.findMany({
            where: {
                channel,
                status: EnumDeliveryStatus.pending,
            },
            take: limit,
            orderBy: { createdAt: 'asc' },
        });
    }
}
