import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserClaimUsernameUseCase implements IAppUseCase<
    [string, UserClaimUsernameRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userProfileService: UserProfileService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        userId: string,
        { username }: UserClaimUsernameRequestDto
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userClaimUsername,
            }),
        ];
        await this.userProfileService.claimUsername(userId, username);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
