import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { INotification } from '@modules/notification/interfaces/notification.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumNotificationType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    Notification,
    Prisma,
} from '@prisma/client';

@Injectable()
export class NotificationRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffset(
        userId: string,
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<INotification>> {
        return this.paginationService.offset<INotification>(
            this.databaseService.notification,
            {
                ...params,
                where: {
                    ...where,
                    userId,
                },
            }
        );
    }

    async findWithPaginationCursor(
        userId: string,
        { where, ...params }: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<INotification>> {
        return this.paginationService.cursor<INotification>(
            this.databaseService.notification,
            {
                ...params,
                where: {
                    ...where,
                    userId,
                },
            }
        );
    }

    async createLogin(
        userId: string,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<Notification> {
        const data = this.databaseUtil.toPlainObject({
            loginFrom,
            loginWith,
            ipAddress,
            userAgent,
        });

        return this.databaseService.notification.create({
            data: {
                userId,
                type: EnumNotificationType.login,
                title: 'Login',
                body: `Login from ${loginFrom} via ${loginWith}`,
                data: data as Prisma.InputJsonValue,
                createdBy: userId,
            },
        });
    }

    async createMany(
        userIds: string[],
        type: EnumNotificationType,
        title: string,
        body: string,
        data?: Record<string, unknown>,
        createdBy?: string
    ): Promise<number> {
        const payload = data
            ? (this.databaseUtil.toPlainObject(data) as Prisma.InputJsonValue)
            : null;

        const result = await this.databaseService.notification.createMany({
            data: userIds.map(userId => ({
                userId,
                type,
                title,
                body,
                data: payload,
                createdBy,
            })),
        });

        return result.count;
    }

    /**
     * Mark a specific notification as read
     */
    async markAsRead(userId: string, notificationId: string): Promise<void> {
        await this.databaseService.notification.updateMany({
            where: {
                id: notificationId,
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    /**
     * Mark all notifications as read for user
     */
    async markAllAsRead(userId: string): Promise<number> {
        const result = await this.databaseService.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        return result.count;
    }
}

