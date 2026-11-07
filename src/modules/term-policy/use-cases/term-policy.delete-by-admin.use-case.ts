import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type { ITermPolicyActivityLogSubject } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyDeleteByAdminUseCase implements IAppUseCase<
    [string],
    IResponseReturn<TermPolicy>
> {
    constructor(
        private readonly termPolicyService: TermPolicyService,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly activityLogService: ActivityLogService,
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

    async execute(termPolicyId: string): Promise<IResponseReturn<TermPolicy>> {
        const deleted =
            await this.termPolicyService.deleteByAdmin(termPolicyId);
        const timestamp = this.helperDateService.create();
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminTermPolicyDelete,
                deleted,
                timestamp
            ),
        ];
        this.activityLogService.stagePrepared(activityLogs);

        return { data: deleted };
    }
}
