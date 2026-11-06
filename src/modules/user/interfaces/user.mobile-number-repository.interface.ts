import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type {
    IUserMobileNumber,
    IUserMobileNumberSummary,
} from '@modules/user/interfaces/user.interface';

export interface IUserMobileNumberRepository {
    findOneMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<IUserMobileNumberSummary | null>;
    existsMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        excludeId: string | null
    ): Promise<boolean>;
    addInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IUserMobileNumber>;
    updateInTx(
        tx: IDatabaseTransactionClient,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        isVerified: boolean
    ): Promise<IUserMobileNumber>;
    deleteInTx(
        tx: IDatabaseTransactionClient,
        mobileNumberId: string
    ): Promise<IUserMobileNumber | null>;
    deleteByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void>;
}
