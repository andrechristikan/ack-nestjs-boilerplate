import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    UserLoginHistoryEntity,
    UserLoginHistorySchema,
} from 'src/modules/user/repository/entities/user-login-history.entity';
import {
    UserPasswordHistoryEntity,
    UserPasswordHistorySchema,
} from 'src/modules/user/repository/entities/user-password-history.entity';
import {
    UserStateHistoryEntity,
    UserStateHistorySchema,
} from 'src/modules/user/repository/entities/user-state-history.entity';
import {
    UserEntity,
    UserSchema,
} from 'src/modules/user/repository/entities/user.entity';
import { UserLoginHistoryRepository } from 'src/modules/user/repository/repositories/user-login-history.repository';
import { UserPasswordHistoryRepository } from 'src/modules/user/repository/repositories/user-password-history.repository';
import { UserStateHistoryRepository } from 'src/modules/user/repository/repositories/user-state-history.repository';
import { UserRepository } from 'src/modules/user/repository/repositories/user.repository';

@Module({
    providers: [
        UserRepository,
        UserStateHistoryRepository,
        UserPasswordHistoryRepository,
        UserLoginHistoryRepository,
    ],
    exports: [
        UserRepository,
        UserStateHistoryRepository,
        UserPasswordHistoryRepository,
        UserLoginHistoryRepository,
    ],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: UserEntity.name,
                    schema: UserSchema,
                },
                {
                    name: UserStateHistoryEntity.name,
                    schema: UserStateHistorySchema,
                },
                {
                    name: UserLoginHistoryEntity.name,
                    schema: UserLoginHistorySchema,
                },
                {
                    name: UserPasswordHistoryEntity.name,
                    schema: UserPasswordHistorySchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class UserRepositoryModule {}
