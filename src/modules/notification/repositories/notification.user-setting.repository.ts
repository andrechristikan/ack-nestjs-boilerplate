import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumNotificationChannel,
    EnumNotificationType,
    NotificationUserSetting,
} from '@prisma/client';

@Injectable()
export class NotificationUserSettingRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    // async findWithPaginationOffset(
    //     userId: string,
    //     { where, ...params }: IPaginationQueryOffsetParams
    // ): Promise<IResponsePagingReturn<NotificationUserSetting>> {
    //     return this.paginationService.offset<NotificationUserSetting>(
    //         this.databaseService.notificationUserSetting,
    //         {
    //             ...params,
    //             where: {
    //                 ...where,
    //                 userId,
    //             },
    //         }
    //     );
    // }

    // async findWithPaginationCursor(
    //     userId: string,
    //     { where, ...params }: IPaginationQueryCursorParams
    // ): Promise<IResponsePagingReturn<NotificationUserSetting>> {
    //     return this.paginationService.cursor<NotificationUserSetting>(
    //         this.databaseService.notificationUserSetting,
    //         {
    //             ...params,
    //             where: {
    //                 ...where,
    //                 userId,
    //             },
    //         }
    //     );
    // }

    // async initialize(userId: string): Promise<number> {
    //     const data = Object.values(EnumNotificationChannel).flatMap(channel =>
    //         Object.values(EnumNotificationType).map(type => ({
    //             userId,
    //             channel,
    //             type,
    //             isEnabled: true,
    //             createdBy: userId,
    //         }))
    //     );

    //     const created =
    //         await this.databaseService.notificationUserSetting.createMany({
    //             data,
    //         });

    //     return created.count;
    // }

    // async updateStatus(
    //     userId: string,
    //     channel: EnumNotificationChannel,
    //     type: EnumNotificationType,
    //     isEnabled: boolean
    // ): Promise<NotificationUserSetting> {
    //     return this.databaseService.notificationUserSetting.update({
    //         where: {
    //             userId_channel_type: {
    //                 userId,
    //                 channel,
    //                 type,
    //             },
    //         },
    //         data: {
    //             isEnabled,
    //         },
    //     });
    // }
}
