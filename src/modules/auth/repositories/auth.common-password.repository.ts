import { DatabaseService } from '@common/database/services/database.service';
import type { IAuthCommonPasswordRepository } from '@modules/auth/interfaces/auth.common-password-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthCommonPasswordRepository implements IAuthCommonPasswordRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async existsByValue(value: string): Promise<boolean> {
        const count = await this.databaseService.client.commonPassword.count({
            where: { value },
        });

        return count > 0;
    }
}
