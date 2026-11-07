import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import type { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import type { IApiKeyActivityLogSubject } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ApiKeyCreateByAdminUseCase implements IAppUseCase<
    [ApiKeyCreateRequestDto],
    IResponseReturn<ApiKeyCreateResponseDto>
> {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly apiKeyUtil: ApiKeyUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly databaseUtil: DatabaseUtil,
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
        body: ApiKeyCreateRequestDto
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        const apiKeyId = this.databaseUtil.createId();
        const activityLogs = [
            this.prepareActivityLog(EnumActivityLogAction.adminApiKeyCreate, {
                id: apiKeyId,
                name: body.name,
                type: body.type,
            }),
        ];

        const { apiKey, secret } = await this.apiKeyService.createByAdmin(
            apiKeyId,
            {
                name: body.name,
                type: body.type,
                startAt: body.startAt ?? null,
                endAt: body.endAt ?? null,
            }
        );
        this.activityLogService.stagePrepared(activityLogs);
        const created = this.apiKeyUtil.mapCreate(apiKey, secret);

        return { data: created };
    }
}
