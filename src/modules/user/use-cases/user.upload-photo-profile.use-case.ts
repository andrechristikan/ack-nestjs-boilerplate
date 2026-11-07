import type { IFile } from '@common/file/interfaces/file.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserUploadPhotoProfileUseCase implements IAppUseCase<
    [string, IFile],
    IResponseReturn<void>
> {
    constructor(
        private readonly userProfileService: UserProfileService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(userId: string, file: IFile): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userUpdatePhotoProfile,
            }),
        ];
        await this.userProfileService.uploadPhotoProfile(userId, file);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
