import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationEqual,
    IPaginationIn,
} from '@common/pagination/interfaces/pagination.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserImportRepository {
    constructor(
        private readonly databaseService: DatabaseService
    ) {}

    async findByEmails(emails: string[]): Promise<IUser[]> {
        return this.databaseService.client.user.findMany({
            where: {
                email: { in: emails },
            },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async findByUsernames(usernames: string[]): Promise<IUser[]> {
        return this.databaseService.client.user.findMany({
            where: {
                username: { in: usernames },
            },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async findExport(
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IUser[]> {
        return this.databaseService.client.user.findMany({
            where: {
                ...status,
                ...countryId,
                ...roleId,
                deletedAt: null,
            },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }
}
