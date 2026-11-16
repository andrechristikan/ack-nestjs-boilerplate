import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class TermPolicyResendEmailByAdminUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, IAuthJwtAccessContext, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        termPolicyId: string
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyService.getPublishedByAdmin(termPolicyId);

        const recipientCutoffAt = this.helperDateService.formatToIso(
            termPolicy.publishedAt!
        );
        const resend = this.termPolicyService.resendPublishEffect(
            {
                termPolicyId: termPolicy.id,
                type: termPolicy.type,
                version: termPolicy.version,
                recipientCutoffAt,
            },
            authContext.userId
        );

        const timestamp = this.helperDateService.create();
        const metadata = this.termPolicyUtil.mapActivityLogMetadata(
            termPolicy,
            timestamp
        );
        const entry = this.activityLogService.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.adminTermPolicyResendEmail,
                metadata,
            }
        );
        await this.outboxService.addMany([resend, entry]);

        return {};
    }
}
