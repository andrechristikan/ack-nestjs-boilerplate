import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { UserUpdateProfilePhotoRequestDto } from '@modules/user/dtos/request/user.update-profile-photo.request.dto';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserUpdatePhotoProfileUseCase implements IAppUseCase<
    [string, UserUpdateProfilePhotoRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userProfileService: UserProfileService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        userId: string,
        { key }: UserUpdateProfilePhotoRequestDto
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userUpdatePhotoProfile,
            }),
        ];
        await this.userProfileService.updatePhotoProfile(userId, { key });

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
