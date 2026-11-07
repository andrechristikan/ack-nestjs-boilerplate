import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import type { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyRemoveContentByAdminUseCase implements IAppUseCase<
    [string, TermPolicyRemoveContentRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly termPolicyContentService: TermPolicyContentService,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly helperDateService: HelperDateService
    ) {}

    private prepareActivityLog(
        action: EnumActivityLogAction,
        termPolicy: TermPolicy
    ): IActivityLogStaged {
        const timestamp = this.helperDateService.create();
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
        { language }: TermPolicyRemoveContentRequestDto
    ): Promise<IResponseReturn<void>> {
        const termPolicy =
            await this.termPolicyContentService.removeContentByAdmin(
                termPolicyId,
                language
            );
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminTermPolicyRemoveContent,
                termPolicy
            ),
        ];
        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
