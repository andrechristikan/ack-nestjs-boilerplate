import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { MfaPasskeyUpdateRequestDto } from '@modules/mfa/dtos/request/mfa.passkey-update.request.dto';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaUpdatePasskeyUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        string,
        MfaPasskeyUpdateRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly mfaPasskeyService: MfaPasskeyService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly outboxService: OutboxService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        passkeyId: string,
        { name }: MfaPasskeyUpdateRequestDto
    ): Promise<IResponseReturn<void>> {
        await this.outboxService.withTransaction(async tx => {
            await this.mfaPasskeyService.updateNameInTx(
                tx,
                authContext.userId,
                passkeyId,
                name
            );
            const entry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userUpdateMfaPasskey }
            );
            await this.outboxService.addInTx(tx, entry);
        });

        return {};
    }
}
