import { Injectable } from '@nestjs/common';
import { IDatabaseDeleteOptions } from 'src/common/database/interfaces/database.interface';
import { IUserBulkService } from 'src/modules/user/interfaces/user.bulk-service.interface';
import { UserBulkRepository } from 'src/modules/user/repositories/user.bulk.repository';

@Injectable()
export class UserBulkService implements IUserBulkService {
    constructor(private readonly userBulkRepository: UserBulkRepository) {}

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteOptions
    ): Promise<boolean> {
        return this.userBulkRepository.deleteMany(find, options);
    }
}
