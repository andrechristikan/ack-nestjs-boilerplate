import { Injectable } from '@nestjs/common';
import { IDatabaseManyOptions } from 'src/common/database/interfaces/database.interface';
import { IUserBulkService } from 'src/modules/user/interfaces/user.bulk-service.interface';
import { UserRepository } from 'src/modules/user/repository/repositories/user.repository';

@Injectable()
export class UserBulkService implements IUserBulkService {
    constructor(private readonly userRepository: UserRepository) {}

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.userRepository.deleteMany(find, options);
    }
}
