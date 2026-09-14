import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { Country, UserMobileNumber } from '@generated/prisma-client';
import { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.mobile-number.request.dto';
import { IUserMobileNumberRepository } from '@modules/user/interfaces/user.mobile-number.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMobileNumberRepository implements IUserMobileNumberRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findOneMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<{
        id: string;
        number: string;
        phoneCode: string;
        isVerified: boolean;
    } | null> {
        return this.databaseService.client.userMobileNumber.findFirst({
            where: {
                id: mobileNumberId,
                user: {
                    id: userId,
                },
            },
            select: {
                id: true,
                number: true,
                phoneCode: true,
                isVerified: true,
            },
        });
    }

    async existsMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        excludeId?: string
    ): Promise<boolean> {
        const count = await this.databaseService.client.userMobileNumber.count({
            where: {
                number,
                countryId,
                phoneCode,
                user: {
                    id: userId,
                },
                ...(excludeId
                    ? {
                          id: { not: excludeId },
                      }
                    : {}),
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
                createdBy: userId,
            },
            include: {
                country: true,
            },
        });
    }

    async updateInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
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
                updatedBy: userId,
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
}
