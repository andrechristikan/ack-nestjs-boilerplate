import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.mobile-number.request.dto';
import { IUserMobileNumberHttpService } from '@modules/user/interfaces/user.mobile-number.http.service.interface';
import { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMobileNumberHttpService implements IUserMobileNumberHttpService {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService
    ) {}

    async addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        const mobileNumber = await this.userMobileNumberService.addMobileNumber(
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
            await this.userMobileNumberService.updateMobileNumber(
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
            await this.userMobileNumberService.deleteMobileNumber(
                userId,
                mobileNumberId
            );

        return { data: mobileNumber };
    }
}
