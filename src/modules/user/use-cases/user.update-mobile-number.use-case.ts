import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { CountryService } from '@modules/country/services/country.service';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserUpdateMobileNumberUseCase implements IAppUseCase<
    [string, string, UserAddMobileNumberRequestDto],
    IResponseReturn<IUserMobileNumber>
> {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService,
        private readonly countryService: CountryService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userUpdateMobileNumber,
            }),
        ];
        // Sequential by design: gate before the work it guards
        const current = await this.userMobileNumberService.getOneMobileNumber(
            userId,
            mobileNumberId
        );
        const [country, isDuplicate] = await Promise.all([
            this.countryService.getOne(countryId),
            this.userMobileNumberService.existsMobileNumber(
                userId,
                { number, countryId, phoneCode },
                current.id
            ),
        ]);
        const mobileNumber =
            await this.userMobileNumberService.updateMobileNumber(
                userId,
                current,
                { number, countryId, phoneCode },
                country.phoneCode,
                isDuplicate
            );

        this.activityLogService.stagePrepared(activityLogs);

        return { data: mobileNumber };
    }
}
