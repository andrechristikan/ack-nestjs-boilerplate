import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import { ApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.not-found.exception';
import type { IApiKey } from '@modules/api-key/interfaces/api-key.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ApiKeyUpdateStatusByAdminUseCase implements IAppUseCase<
    [string, ApiKeyUpdateStatusRequestDto, IRequestContext],
    IResponseReturn<IApiKey>
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
        id: string,
        { isActive }: ApiKeyUpdateStatusRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<IApiKey>> {
        try {
            const updated = await this.outboxService.withTransaction(
                async tx => {
                    const apiKey =
                        await this.apiKeyService.updateStatusByAdminInTx(
                            tx,
                            id,
                            isActive
                        );

                    const timestamp = this.helperDateService.create();
                    const metadata = this.apiKeyUtil.mapActivityLogMetadata(
                        apiKey,
                        timestamp
                    );
                    const effect = this.activityLogService.recordEffect(
                        {
                            action: EnumActivityLogAction.adminApiKeyUpdateStatus,
                            metadata,
                        },
                        context
                    );
                    await this.outboxService.addInTx(tx, effect);

                    return apiKey;
                }
            );

            return { data: updated };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new ApiKeyNotFoundException();
            }

            throw new AppUnknownException(err);
        }
    }
}
