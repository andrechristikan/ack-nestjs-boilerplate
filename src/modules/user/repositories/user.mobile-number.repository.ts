import { DatabaseRepositoryBase } from '@common/database/bases/database.repository.base';
import { DatabaseEmptyErrorContract } from '@common/database/contracts/database.empty-error.contract';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    UserMobileNumberRefSelect,
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
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserMobileNumberRepository
    extends DatabaseRepositoryBase
    implements IUserMobileNumberRepository
{
    private readonly deletedMobileNumberPattern: string;

    protected override readonly errorContract = DatabaseEmptyErrorContract;

    constructor(
        private readonly databaseService: DatabaseService,
        protected override readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService
    ) {
        super();

        this.deletedMobileNumberPattern = this.configService.get<string>(
            'user.deletedMobileNumberPattern'
        )!;
    }

    async findOneMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<IUserMobileNumberSummary | null> {
        return this.databaseService.client.userMobileNumber.findFirst({
            where: {
                id: mobileNumberId,
                userId,
                deletedAt: null,
            },
            select: UserMobileNumberSummarySelect,
        });
    }

    async findManyByUser(userId: string): Promise<IUserMobileNumber[]> {
        return this.databaseService.client.userMobileNumber.findMany({
            where: { userId, deletedAt: null },
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
                deletedAt: null,
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
                deletedAt: null,
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
                where: { id: mobileNumberId, userId, deletedAt: null },
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
                where: {
                    id: mobileNumberId,
                    userId,
                    isVerified: false,
                    deletedAt: null,
                },
                data: { isVerified: true, verifiedAt },
            });

            return count > 0;
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async softDeleteInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        mobileNumberId: string,
        deletedAt: Date
    ): Promise<boolean> {
        const deletedMobileNumberPattern = this.deletedMobileNumberPattern;
        try {
            const { count } = await tx.userMobileNumber.updateMany({
                where: { id: mobileNumberId, userId, deletedAt: null },
                data: {
                    number: deletedMobileNumberPattern.replace(
                        '{id}',
                        () => mobileNumberId
                    ),
                    deletedAt,
                    deletedBy: userId,
                },
            });

            return count > 0;
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async softDeleteByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deletedAt: Date
    ): Promise<void> {
        const mobileNumbers = await tx.userMobileNumber.findMany({
            where: { userId, deletedAt: null },
            select: UserMobileNumberRefSelect,
        });

        const deletedMobileNumberPattern = this.deletedMobileNumberPattern;
        await Promise.all(
            mobileNumbers.map(({ id }) =>
                tx.userMobileNumber.updateMany({
                    where: { id, deletedAt: null },
                    data: {
                        number: deletedMobileNumberPattern.replace(
                            '{id}',
                            () => id
                        ),
                        deletedAt,
                        deletedBy: userId,
                    },
                })
            )
        );
    }
}
