import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import type { IApiKeyActivityLogSubject } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ApiKeyResetByAdminUseCase implements IAppUseCase<
    [string],
    IResponseReturn<ApiKeyCreateResponseDto>
> {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly apiKeyUtil: ApiKeyUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly helperDateService: HelperDateService
    ) {}

    private prepareActivityLog(
        action: EnumActivityLogAction,
        apiKey: IApiKeyActivityLogSubject
    ): IActivityLogStaged {
        const timestamp = this.helperDateService.create();
        const metadata = this.apiKeyUtil.mapActivityLogMetadata(
            apiKey,
            timestamp
        );

        return this.activityLogService.prepare({
            action,
            metadata,
        });
    }

    async execute(
        id: string
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        const { apiKey, secret } = await this.apiKeyService.resetByAdmin(id);
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyReset,
                apiKey
            ),
        ];
        this.activityLogService.stagePrepared(activityLogs);
        const reset = this.apiKeyUtil.mapCreate(apiKey, secret);

        return { data: reset };
    }
}
