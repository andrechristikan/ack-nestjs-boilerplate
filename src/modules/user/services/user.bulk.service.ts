import { Injectable } from '@nestjs/common';
import { DatabaseRepository } from 'src/common/database/decorators/database.decorator';
import { IDatabaseManyOptions } from 'src/common/database/interfaces/database.interface';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { IUserBulkService } from 'src/modules/user/interfaces/user.bulk-service.interface';
import {
    UserEntity,
    UserRepository,
} from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class UserBulkService implements IUserBulkService {
    constructor(
        @DatabaseRepository(UserRepository)
        private readonly userRepository: IDatabaseRepository<UserEntity>
    ) {}

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.userRepository.deleteMany(find, options);
    }
}
