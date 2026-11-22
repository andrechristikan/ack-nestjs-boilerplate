import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class NotificationGetListUserSettingUseCase implements IAppUseCase<
    [IAuthJwtAccessContext],
    IResponseReturn<NotificationUserSettingResponseDto>
> {
    constructor(private readonly notificationService: NotificationService) {}

    async execute(
        authContext: IAuthJwtAccessContext
    ): Promise<IResponseReturn<NotificationUserSettingResponseDto>> {
        const settings = await this.notificationService.getListUserSetting(
            authContext.userId
        );

        return {
            data: {
                settings,
            },
        };
    }
}
