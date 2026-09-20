import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberDomain } from '@modules/user/domains/user.mobile-number.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMobileNumberHttpService {
    constructor(
        private readonly userMobileNumberDomain: UserMobileNumberDomain
    ) {}

    async addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const mobileNumber = await this.userMobileNumberDomain.addMobileNumber(
            userId,
            {
                number,
                countryId,
                phoneCode,
            }
        );

        return { data: mobileNumber };
    }

    async updateMobileNumber(
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const mobileNumber =
            await this.userMobileNumberDomain.updateMobileNumber(
                userId,
                mobileNumberId,
                { number, countryId, phoneCode }
            );

        return { data: mobileNumber };
    }

    async deleteMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const mobileNumber =
            await this.userMobileNumberDomain.deleteMobileNumber(
                userId,
                mobileNumberId
            );

        return { data: mobileNumber };
    }
}
