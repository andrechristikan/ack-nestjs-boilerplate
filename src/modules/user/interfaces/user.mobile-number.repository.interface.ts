import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    Country,
    UserMobileNumber,
} from '@generated/prisma-client/client';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';

export interface IUserMobileNumberRepository {
    findOneMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<{
        id: string;
        number: string;
        phoneCode: string;
        isVerified: boolean;
    } | null>;
    existsMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        excludeId?: string
    ): Promise<boolean>;
    addInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<UserMobileNumber & { country: Country }>;
    updateInTx(
        tx: IDatabaseTransactionClient,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        isVerified: boolean
    ): Promise<UserMobileNumber & { country: Country }>;
    deleteInTx(
        tx: IDatabaseTransactionClient,
        mobileNumberId: string
    ): Promise<UserMobileNumber & { country: Country }>;
}
