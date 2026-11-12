import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationUpdateUserSettingUseCase implements IAppUseCase<
    [string, NotificationUserSettingRequestDto, IRequestContext],
    IResponseReturn<void>
> {
    constructor(private readonly notificationService: NotificationService) {}

    async execute(
        userId: string,
        data: NotificationUserSettingRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        await this.notificationService.updateUserSetting(userId, data, context);

        return {};
    }
}
