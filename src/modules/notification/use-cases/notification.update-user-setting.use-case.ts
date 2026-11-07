import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationUpdateUserSettingUseCase implements IAppUseCase<
    [string, NotificationUserSettingRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        userId: string,
        data: NotificationUserSettingRequestDto
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userUpdateNotificationSetting,
                metadata: {
                    channel: data.channel,
                    type: data.type,
                    isActive: data.isActive,
                },
            }),
        ];
        await this.notificationService.updateUserSetting(userId, data);
        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
