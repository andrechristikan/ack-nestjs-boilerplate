import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    UserHistoryEntity,
    UserHistorySchema,
} from 'src/modules/user/repository/entities/user-history.entity';
import {
    UserEntity,
    UserSchema,
} from 'src/modules/user/repository/entities/user.entity';
import { UserHistoryRepository } from 'src/modules/user/repository/repositories/user-history.repository';
import { UserRepository } from 'src/modules/user/repository/repositories/user.repository';

@Module({
    providers: [UserRepository, UserHistoryRepository],
    exports: [UserRepository, UserHistoryRepository],
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
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class UserRepositoryModule {}
