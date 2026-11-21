import { DatabaseService } from '@common/database/services/database.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class NotificationUpdateUserSettingUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        NotificationUserSettingRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly databaseService: DatabaseService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        data: NotificationUserSettingRequestDto
    ): Promise<IResponseReturn<void>> {
        this.notificationService.validateUserSetting(data.type, data.channel);

        await this.databaseService.withTransaction(tx =>
            this.notificationService.updateUserSettingInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                data
            )
        );

        return {};
    }
}
