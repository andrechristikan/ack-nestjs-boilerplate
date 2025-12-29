import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { INotificationService } from '@modules/notification/interfaces/notification.service.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    Notification,
} from '@prisma/client';

@Injectable()
export class NotificationService implements INotificationService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationUtil: NotificationUtil
    ) {}

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<NotificationResponseDto>> {
        const { data, ...others } =
            await this.notificationRepository.findWithPaginationCursor(
                userId,
                pagination
            );

        const notifications: NotificationResponseDto[] =
            this.notificationUtil.mapList(data);
        return {
            data: notifications,
            ...others,
        };
    }

    async createLoginNotification(
        userId: string,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        requestLog: IRequestLog
    ): Promise<Notification> {
        return this.notificationRepository.createLogin(
            userId,
            loginFrom,
            loginWith,
            requestLog
        );
    }
}
