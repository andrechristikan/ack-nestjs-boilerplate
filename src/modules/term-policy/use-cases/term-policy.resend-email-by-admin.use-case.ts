import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type { ITermPolicyActivityLogSubject } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyResendEmailByAdminUseCase implements IAppUseCase<
    [string, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationQueue: NotificationQueue,
        private readonly helperDateService: HelperDateService
    ) {}

    private prepareActivityLog(
        action: EnumActivityLogAction,
        termPolicy: ITermPolicyActivityLogSubject,
        timestamp: Date
    ): IActivityLogStaged {
        const metadata = this.termPolicyUtil.mapActivityLogMetadata(
            termPolicy,
            timestamp
        );

        return this.activityLogService.prepare({
            action,
            metadata,
        });
    }

    async execute(
        termPolicyId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyService.getPublishedByAdmin(termPolicyId);
        const timestamp = this.helperDateService.create();
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminTermPolicyResendEmail,
                termPolicy,
                timestamp
            ),
        ];

        const recipientCutoffAt = this.helperDateService.formatToIso(
            termPolicy.publishedAt!
        );
        await this.notificationQueue.sendResendPublishTermPolicy(
            {
                termPolicyId: termPolicy.id,
                type: termPolicy.type,
                version: termPolicy.version,
                recipientCutoffAt,
            },
            updatedBy
        );

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
