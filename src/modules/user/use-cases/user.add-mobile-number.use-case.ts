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
export class UserAddMobileNumberUseCase implements IAppUseCase<
    [string, UserAddMobileNumberRequestDto],
    IResponseReturn<IUserMobileNumber>
> {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService,
        private readonly countryService: CountryService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userAddMobileNumber,
            }),
        ];
        const [country, isDuplicate] = await Promise.all([
            this.countryService.getOne(countryId),
            this.userMobileNumberService.existsMobileNumber(
                userId,
                { number, countryId, phoneCode },
                null
            ),
        ]);
        const mobileNumber = await this.userMobileNumberService.addMobileNumber(
            userId,
            {
                number,
                countryId,
                phoneCode,
            },
            country.phoneCode,
            isDuplicate
        );

        this.activityLogService.stagePrepared(activityLogs);

        return { data: mobileNumber };
    }
}
