import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    Country,
    UserMobileNumber,
} from '@generated/prisma-client/client';
import { UserMobileNumberSummarySelect } from '@modules/user/constants/user.constant';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type { IUserMobileNumberSummary } from '@modules/user/interfaces/user.interface';
import type { IUserMobileNumberRepository } from '@modules/user/interfaces/user.mobile-number-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMobileNumberRepository implements IUserMobileNumberRepository {
    constructor(private readonly databaseService: DatabaseService) {}

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
    ): Promise<UserMobileNumber & { country: Country }> {
        return tx.userMobileNumber.create({
            data: {
                userId,
                countryId,
                number,
                phoneCode,
            },
            include: {
                country: true,
            },
        });
    }

    async updateInTx(
        tx: IDatabaseTransactionClient,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        isVerified: boolean
    ): Promise<UserMobileNumber & { country: Country }> {
        return tx.userMobileNumber.update({
            where: { id: mobileNumberId },
            data: {
                countryId,
                number,
                phoneCode,
                isVerified,
            },
            include: {
                country: true,
            },
        });
    }

    async deleteInTx(
        tx: IDatabaseTransactionClient,
        mobileNumberId: string
    ): Promise<UserMobileNumber & { country: Country }> {
        const row = await tx.userMobileNumber.findUniqueOrThrow({
            where: { id: mobileNumberId },
            include: {
                country: true,
            },
        });
        await tx.userMobileNumber.delete({
            where: { id: mobileNumberId },
        });

        return row;
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
