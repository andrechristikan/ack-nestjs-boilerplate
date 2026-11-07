import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { CountryService } from '@modules/country/services/country.service';
import type { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.update-profile.request.dto';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserUpdateProfileUseCase implements IAppUseCase<
    [string, UserUpdateProfileRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userProfileService: UserProfileService,
        private readonly countryService: CountryService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        userId: string,
        { countryId, gender, name }: UserUpdateProfileRequestDto
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.countryService.getOne(countryId);

        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userUpdateProfile,
            }),
        ];
        await this.userProfileService.updateProfile(userId, {
            countryId,
            gender,
            name,
        });

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
