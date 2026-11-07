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
import { TermPolicyQueue } from '@modules/term-policy/queues/term-policy.queue';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyPublishByAdminUseCase implements IAppUseCase<
    [string, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationQueue: NotificationQueue,
        private readonly termPolicyQueue: TermPolicyQueue,
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
        const { termPolicy: published, copy } =
            await this.termPolicyService.publishByAdmin(termPolicyId);
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminTermPolicyPublish,
                published,
                published.updatedAt
            ),
        ];
        this.activityLogService.stagePrepared(activityLogs);

        const recipientCutoffAt = this.helperDateService.formatToIso(
            published.publishedAt!
        );
        await Promise.all([
            this.termPolicyQueue.copyContent(copy),
            this.notificationQueue.sendPublishTermPolicy(
                {
                    termPolicyId: published.id,
                    type: published.type,
                    version: published.version,
                    recipientCutoffAt,
                    resendNonce: null,
                },
                updatedBy
            ),
        ]);

        return {};
    }
}
