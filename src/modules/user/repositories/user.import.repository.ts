import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationEqual,
    IPaginationIn,
} from '@common/pagination/interfaces/pagination.interface';
import { IUserExport } from '@modules/user/interfaces/user.interface';
import { User } from '@generated/prisma-client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserImportRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findByEmails(emails: string[]): Promise<Pick<User, 'email'>[]> {
        return this.databaseService.client.user.findMany({
            where: {
                email: { in: emails },
            },
            select: {
                email: true,
            },
        });
    }

    async findByUsernames(
        usernames: string[]
    ): Promise<Pick<User, 'username'>[]> {
        return this.databaseService.client.user.findMany({
            where: {
                username: { in: usernames },
            },
            select: {
                username: true,
            },
        });
    }

    async findExport(
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IUserExport[]> {
        return this.databaseService.client.user.findMany({
            where: {
                ...status,
                ...countryId,
                ...roleId,
                deletedAt: null,
            },
            include: {
                role: { select: { name: true } },
                photo: true,
            },
        });
    }
}
