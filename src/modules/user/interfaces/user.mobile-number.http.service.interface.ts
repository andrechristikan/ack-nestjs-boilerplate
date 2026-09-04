import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.mobile-number.request.dto';
import { UserMobileNumberResponseDto } from '@modules/user/dtos/response/user.mobile-number.response.dto';

export interface IUserMobileNumberHttpService {
    addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>>;
    updateMobileNumber(
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>>;
    deleteMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>>;
}
