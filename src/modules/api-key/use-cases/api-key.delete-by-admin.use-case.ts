import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type {
    IApiKey,
    IApiKeyContext,
} from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class ApiKeyDeleteByAdminUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, IAuthJwtAccessContext, string],
    IResponseReturn<IApiKey>
> {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly apiKeyUtil: ApiKeyUtil,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        id: string
    ): Promise<IResponseReturn<IApiKey>> {
        await this.apiKeyService.getOneById(id);

        const updated = await this.databaseService.withTransaction(async tx => {
            const apiKey = await this.apiKeyService.deleteByAdminInTx(tx, id);

            const timestamp = this.helperDateService.now();
            const metadata = this.apiKeyUtil.mapActivityLogMetadata(
                apiKey,
                timestamp
            );
            const effect = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.adminApiKeyDeleted,
                    metadata,
                }
            );
            await this.outboxService.addInTx(tx, effect);

            return apiKey;
        });

        return { data: updated };
    }
}
