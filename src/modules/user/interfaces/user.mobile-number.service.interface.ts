import {
    IUserMobileNumber,
    IUserMobileNumberInput,
} from '@modules/user/interfaces/user.interface';

export interface IUserMobileNumberService {
    addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: IUserMobileNumberInput
    ): Promise<IUserMobileNumber>;
    updateMobileNumber(
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: IUserMobileNumberInput
    ): Promise<IUserMobileNumber>;
    deleteMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<IUserMobileNumber>;
}
