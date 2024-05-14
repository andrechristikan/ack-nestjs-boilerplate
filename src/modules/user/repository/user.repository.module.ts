import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    UserHistoryEntity,
    UserHistorySchema,
} from 'src/modules/user/repository/entities/user-history.entity';
import {
    UserPasswordEntity,
    UserPasswordSchema,
} from 'src/modules/user/repository/entities/user-password.entity';
import {
    UserEntity,
    UserSchema,
} from 'src/modules/user/repository/entities/user.entity';
import { UserHistoryRepository } from 'src/modules/user/repository/repositories/user-history.repository';
import { UserPasswordRepository } from 'src/modules/user/repository/repositories/user-password.repository';
import { UserRepository } from 'src/modules/user/repository/repositories/user.repository';

@Module({
    providers: [UserRepository, UserHistoryRepository, UserPasswordRepository],
    exports: [UserRepository, UserHistoryRepository, UserPasswordRepository],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: UserEntity.name,
                    schema: UserSchema,
                },
                {
                    name: UserHistoryEntity.name,
                    schema: UserHistorySchema,
                },
                {
                    name: UserPasswordEntity.name,
                    schema: UserPasswordSchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class UserRepositoryModule {}
