import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import type { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ApiKeyCreateByAdminUseCase implements IAppUseCase<
    [IRequestContextUser, ApiKeyCreateRequestDto],
    IResponseReturn<ApiKeyCreateResponseDto>
> {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly apiKeyUtil: ApiKeyUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        context: IRequestContextUser,
        body: ApiKeyCreateRequestDto
    ): Promise<IResponseReturn<ApiKeyCreateResponseDto>> {
        const apiKeyId = this.databaseUtil.createId();
        const { apiKey, secret } = await this.outboxService.withTransaction(
            async tx => {
                const created = await this.apiKeyService.createByAdminInTx(
                    tx,
                    apiKeyId,
                    {
                        name: body.name,
                        type: body.type,
                        startAt: body.startAt ?? null,
                        endAt: body.endAt ?? null,
                    }
                );

                const timestamp = this.helperDateService.create();
                const metadata = this.apiKeyUtil.mapActivityLogMetadata(
                    { id: apiKeyId, name: body.name, type: body.type },
                    timestamp
                );
                const effect = this.activityLogService.recordEffect(
                    context.snapshot,
                    {
                        action: EnumActivityLogAction.adminApiKeyCreate,
                        metadata,
                    }
                );
                await this.outboxService.addInTx(tx, effect);

                return created;
            }
        );
        const created = this.apiKeyUtil.mapCreate(apiKey, secret);

        return { data: created };
    }
}
