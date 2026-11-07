import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type {
    IApiKey,
    IApiKeyActivityLogSubject,
} from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ApiKeyDeleteByAdminUseCase implements IAppUseCase<
    [string],
    IResponseReturn<IApiKey>
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

    async execute(id: string): Promise<IResponseReturn<IApiKey>> {
        const deleted = await this.apiKeyService.deleteByAdmin(id);
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminApiKeyDelete,
                deleted
            ),
        ];
        this.activityLogService.stagePrepared(activityLogs);

        return {
            data: deleted,
        };
    }
}
