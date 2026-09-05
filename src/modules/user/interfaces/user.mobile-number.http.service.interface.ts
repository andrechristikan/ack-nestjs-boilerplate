import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.mobile-number.request.dto';
import { IUserMobileNumber } from '@modules/user/interfaces/user.interface';

export interface IUserMobileNumberHttpService {
    addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>>;
    updateMobileNumber(
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>>;
    deleteMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<IResponseReturn<IUserMobileNumber>>;
}
