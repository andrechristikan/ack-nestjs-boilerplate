import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyUserAcceptUseCase implements IAppUseCase<
    [IUser, TermPolicyAcceptRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        user: IUser,
        { type }: TermPolicyAcceptRequestDto
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userAcceptTermPolicy,
            }),
        ];
        await this.termPolicyAcceptanceService.userAccept(user.id, type);
        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
