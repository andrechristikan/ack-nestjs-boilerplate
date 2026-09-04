import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.mobile-number.request.dto';
import { UserMobileNumberResponseDto } from '@modules/user/dtos/response/user.mobile-number.response.dto';
import { IUserMobileNumberHttpService } from '@modules/user/interfaces/user.mobile-number.http.service.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMobileNumberHttpService implements IUserMobileNumberHttpService {
    constructor(
        private readonly userMobileNumberService: UserMobileNumberService,
        private readonly userUtil: UserUtil
    ) {}

    async addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>> {
        const mobileNumber = await this.userMobileNumberService.addMobileNumber(
            userId,
            {
                number,
                countryId,
                phoneCode,
            }
        );

        return { data: this.userUtil.mapMobileNumber(mobileNumber) };
    }

    async updateMobileNumber(
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>> {
        const mobileNumber =
            await this.userMobileNumberService.updateMobileNumber(
                userId,
                mobileNumberId,
                { number, countryId, phoneCode }
            );

        return { data: this.userUtil.mapMobileNumber(mobileNumber) };
    }

    async deleteMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>> {
        const mobileNumber =
            await this.userMobileNumberService.deleteMobileNumber(
                userId,
                mobileNumberId
            );

        return { data: this.userUtil.mapMobileNumber(mobileNumber) };
    }
}
