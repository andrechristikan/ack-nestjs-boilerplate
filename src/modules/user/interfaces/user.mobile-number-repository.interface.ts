import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    Country,
    UserMobileNumber,
} from '@generated/prisma-client/client';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
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
        verifiedAt: Date | null;
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
        isVerified: boolean,
        verifiedAt: Date | null
    ): Promise<UserMobileNumber & { country: Country }>;
    markVerifiedInTx(
        tx: IDatabaseTransactionClient,
        mobileNumberId: string,
        number: string,
        phoneCode: string,
        verifiedAt: Date
    ): Promise<IUserMobileNumber | null>;
    deleteInTx(
        tx: IDatabaseTransactionClient,
        mobileNumberId: string
    ): Promise<UserMobileNumber & { country: Country }>;
}
