import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserDeleteMobileNumberUseCase implements IAppUseCase<
    [string, string],
    IResponseReturn<IUserMobileNumber>
> {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        userId: string,
        mobileNumberId: string
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userDeleteMobileNumber,
            }),
        ];
        const mobileNumber =
            await this.userMobileNumberService.deleteMobileNumber(
                userId,
                mobileNumberId
            );

        this.activityLogService.stagePrepared(activityLogs);

        return { data: mobileNumber };
    }
}
