import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import type { IApiKey } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ApiKeyUpdateByAdminUseCase implements IAppUseCase<
    [IRequestContextUser, string, ApiKeyUpdateRequestDto],
    IResponseReturn<IApiKey>
> {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly apiKeyUtil: ApiKeyUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        context: IRequestContextUser,
        id: string,
        { name }: ApiKeyUpdateRequestDto
    ): Promise<IResponseReturn<IApiKey>> {
        const updated = await this.outboxService.withTransaction(async tx => {
            const apiKey = await this.apiKeyService.updateByAdminInTx(
                tx,
                id,
                name
            );

            const timestamp = this.helperDateService.create();
            const metadata = this.apiKeyUtil.mapActivityLogMetadata(
                apiKey,
                timestamp
            );
            const effect = this.activityLogService.recordEffect(
                context.snapshot,
                {
                    action: EnumActivityLogAction.adminApiKeyUpdate,
                    metadata,
                }
            );
            await this.outboxService.addInTx(tx, effect);

            return apiKey;
        });

        return { data: updated };
    }
}
