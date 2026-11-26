import { DatabaseRepositoryBase } from '@common/database/bases/database.repository.base';
import { DatabaseEmptyErrorContract } from '@common/database/contracts/database.empty-error.contract';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    UserMobileNumberSummarySelect,
    UserMobileNumberWithCountryInclude,
} from '@modules/user/constants/user.constant';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type {
    IUserMobileNumber,
    IUserMobileNumberSummary,
} from '@modules/user/interfaces/user.interface';
import type { IUserMobileNumberRepository } from '@modules/user/interfaces/user.mobile-number-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMobileNumberRepository
    extends DatabaseRepositoryBase
    implements IUserMobileNumberRepository
{
    protected override readonly errorContract = DatabaseEmptyErrorContract;

    constructor(
        private readonly databaseService: DatabaseService,
        protected override readonly databaseUtil: DatabaseUtil
    ) {
        super();
    }

    async findOneMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<IUserMobileNumberSummary | null> {
        return this.databaseService.client.userMobileNumber.findFirst({
            where: {
                id: mobileNumberId,
                userId,
            },
            select: UserMobileNumberSummarySelect,
        });
    }

    async findManyByUser(userId: string): Promise<IUserMobileNumber[]> {
        return this.databaseService.client.userMobileNumber.findMany({
            where: { userId },
            include: UserMobileNumberWithCountryInclude,
        });
    }

    async existsMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        excludeId: string | null
    ): Promise<boolean> {
        const count = await this.databaseService.client.userMobileNumber.count({
            where: {
                number,
                countryId,
                phoneCode,
                userId,
                ...(excludeId !== null && { id: { not: excludeId } }),
            },
        });

        return count > 0;
    }

    async addInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IUserMobileNumber> {
        return tx.userMobileNumber.create({
            data: {
                userId,
                countryId,
                number,
                phoneCode,
            },
            include: UserMobileNumberWithCountryInclude,
        });
    }

    async updateInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        isVerified: boolean
    ): Promise<IUserMobileNumber> {
        try {
            return await tx.userMobileNumber.update({
                where: { id: mobileNumberId, userId },
                data: {
                    countryId,
                    number,
                    phoneCode,
                    isVerified,
                },
                include: UserMobileNumberWithCountryInclude,
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async markVerifiedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        mobileNumberId: string,
        verifiedAt: Date
    ): Promise<boolean> {
        try {
            const { count } = await tx.userMobileNumber.updateMany({
                where: { id: mobileNumberId, userId, isVerified: false },
                data: { isVerified: true, verifiedAt },
            });

            return count > 0;
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async deleteInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        mobileNumberId: string
    ): Promise<IUserMobileNumber> {
        try {
            return await tx.userMobileNumber.delete({
                where: { id: mobileNumberId, userId },
                include: UserMobileNumberWithCountryInclude,
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async deleteByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await tx.userMobileNumber.deleteMany({
            where: { userId },
        });
    }
}
