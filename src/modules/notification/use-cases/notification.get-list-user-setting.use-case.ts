import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationGetListUserSettingUseCase implements IAppUseCase<
    [string],
    IResponseReturn<NotificationUserSettingResponseDto>
> {
    constructor(private readonly notificationService: NotificationService) {}

    async execute(
        userId: string
    ): Promise<IResponseReturn<NotificationUserSettingResponseDto>> {
        const settings =
            await this.notificationService.getListUserSetting(userId);

        return {
            data: {
                settings,
            },
        };
    }
}
