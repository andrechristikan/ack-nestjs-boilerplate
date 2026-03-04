import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { NotificationUserSettingDto } from '@modules/notification/dtos/notification.user-setting.dto';
import { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';
import { INotificationService } from '@modules/notification/interfaces/notification.service.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

@Injectable()
export class NotificationService implements INotificationService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationUtil: NotificationUtil
    ) {}

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.NotificationSelect,
            Prisma.NotificationWhereInput
        >
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

    async getListUserSetting(
        userId: string
    ): Promise<IResponseReturn<NotificationUserSettingResponseDto>> {
        const userSettings =
            await this.notificationRepository.findUserSetting(userId);

        const settings: NotificationUserSettingDto[] =
            this.notificationUtil.mapUserSettingList(userSettings);

        return {
            data: {
                settings: settings,
            },
        };
    }

    async markAsRead(
        userId: string,
        notificationId: string
    ): Promise<IResponseReturn<void>> {
        const checkExist = await this.notificationRepository.existById(
            userId,
            notificationId
        );
        if (!checkExist) {
            throw new NotFoundException({
                statusCode: EnumNotificationStatusCodeError.notFound,
                message: 'notification.error.notFound',
            });
        } else if (checkExist.isRead) {
            throw new BadRequestException({
                statusCode: EnumNotificationStatusCodeError.alreadyRead,
                message: 'notification.error.alreadyRead',
            });
        }

        await this.notificationRepository.markAsRead(userId, notificationId);

        return;
    }

    async markAllAsRead(userId: string): Promise<IResponseReturn<void>> {
        const batchUpdated =
            await this.notificationRepository.markAllAsRead(userId);

        return {
            metadata: {
                messageProperties: {
                    count: batchUpdated.count,
                },
            },
        };
    }

    async updateUserSetting(
        userId: string,
        data: NotificationUserSettingRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        this.notificationUtil.validateUserSetting(data.type, data.channel);

        await this.notificationRepository.updateUserSetting(
            userId,
            data,
            requestLog
        );

        return;
    }
}
