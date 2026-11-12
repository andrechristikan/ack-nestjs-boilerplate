import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';

@Injectable()
export class TermPolicyResendEmailByAdminUseCase implements IAppUseCase<
    [IRequestContextUser, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationService: NotificationService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        context: IRequestContextUser,
        termPolicyId: string
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyService.getPublishedByAdmin(termPolicyId);

        const recipientCutoffAt = this.helperDateService.formatToIso(
            termPolicy.publishedAt!
        );
        const resend = this.notificationService.resendPublishTermPolicyEffect(
            {
                termPolicyId: termPolicy.id,
                type: termPolicy.type,
                version: termPolicy.version,
                recipientCutoffAt,
            },
            context.user.id
        );

        const timestamp = this.helperDateService.create();
        const metadata = this.termPolicyUtil.mapActivityLogMetadata(
            termPolicy,
            timestamp
        );
        const entry = this.activityLogService.recordEffect(context.snapshot, {
            action: EnumActivityLogAction.adminTermPolicyResendEmail,
            metadata,
        });
        await this.outboxService.addMany([resend, entry]);

        return {};
    }
}
