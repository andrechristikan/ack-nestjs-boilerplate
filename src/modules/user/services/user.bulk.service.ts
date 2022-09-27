import { Injectable } from '@nestjs/common';
import { IDatabaseSoftDeleteOptions } from 'src/common/database/interfaces/database.interface';
import { IUserBulkService } from 'src/modules/user/interfaces/user.bulk-service.interface';
import { UserBulkRepository } from 'src/modules/user/repositories/user.bulk.repository';

@Injectable()
export class UserBulkService implements IUserBulkService {
    constructor(private readonly userBulkRepository: UserBulkRepository) {}

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<boolean> {
        return this.userBulkRepository.deleteMany(find, options);
    }
}
