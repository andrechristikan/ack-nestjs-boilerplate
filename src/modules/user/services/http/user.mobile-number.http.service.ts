import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { CountryDomain } from '@modules/country/domains/country.domain';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberDomain } from '@modules/user/domains/user.mobile-number.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMobileNumberHttpService {
    constructor(
        private readonly userMobileNumberDomain: UserMobileNumberDomain,
        private readonly countryDomain: CountryDomain,
        private readonly activityLogDomain: ActivityLogDomain
    ) {}

    async addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const [country, isDuplicate] = await Promise.all([
            this.countryDomain.getOne(countryId),
            this.userMobileNumberDomain.existsMobileNumber(
                userId,
                { number, countryId, phoneCode },
                null
            ),
        ]);

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userAddMobileNumber,
            }),
        ];
        const mobileNumber = await this.userMobileNumberDomain.addMobileNumber(
            userId,
            {
                number,
                countryId,
                phoneCode,
            },
            country.phoneCode,
            isDuplicate
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: mobileNumber };
    }

    async updateMobileNumber(
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        // Sequential by design: gate before the work it guards
        const current = await this.userMobileNumberDomain.getOneMobileNumber(
            userId,
            mobileNumberId
        );
        const [country, isDuplicate] = await Promise.all([
            this.countryDomain.getOne(countryId),
            this.userMobileNumberDomain.existsMobileNumber(
                userId,
                { number, countryId, phoneCode },
                current.id
            ),
        ]);

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userUpdateMobileNumber,
            }),
        ];
        const mobileNumber =
            await this.userMobileNumberDomain.updateMobileNumber(
                userId,
                current,
                { number, countryId, phoneCode },
                country.phoneCode,
                isDuplicate
            );

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: mobileNumber };
    }

    async deleteMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userDeleteMobileNumber,
            }),
        ];
        const mobileNumber =
            await this.userMobileNumberDomain.deleteMobileNumber(
                userId,
                mobileNumberId
            );

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: mobileNumber };
    }
}
