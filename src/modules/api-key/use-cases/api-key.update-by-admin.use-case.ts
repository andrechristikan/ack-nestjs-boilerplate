import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
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
export class ApiKeyUpdateByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        string,
        ApiKeyUpdateRequestDto,
    ],
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
        id: string,
        { name }: ApiKeyUpdateRequestDto
    ): Promise<IResponseReturn<IApiKey>> {
        const row = await this.apiKeyService.getOneById(id);
        this.apiKeyService.assertActive(row);

        const updated = await this.databaseService.withTransaction(async tx => {
            const apiKey = await this.apiKeyService.updateByAdminInTx(
                tx,
                row,
                name
            );

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
                    action: EnumActivityLogAction.adminApiKeyUpdated,
                    metadata,
                }
            );
            await this.outboxService.addInTx(tx, effect);

            return apiKey;
        });

        return { data: updated };
    }
}
