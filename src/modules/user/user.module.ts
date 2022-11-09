import { Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseRepositoryModule } from 'src/common/database/database.repository.module';
import { UserRepository } from 'src/modules/user/repository/entities/user.entity';
import {
    UserMongoEntity,
    UserMongoSchema,
} from 'src/modules/user/repository/entities/user.mongo.entity';
import { UserPostgresEntity } from 'src/modules/user/repository/entities/user.postgres.entity';
import { UserMongoRepository } from 'src/modules/user/repository/repositories/user.mongo.repository';
import { UserPostgresRepository } from 'src/modules/user/repository/repositories/user.postgres.repository';
import { UserBulkService } from './services/user.bulk.service';
import { UserService } from './services/user.service';
@Module({
    imports: [
        DatabaseRepositoryModule.forFutureAsync({
            name: UserRepository,
            mongo: {
                schema: UserMongoSchema,
                entity: UserMongoEntity,
                repository: UserMongoRepository,
            },
            postgres: {
                entity: UserPostgresEntity,
                repository: UserPostgresRepository,
            },
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
    exports: [UserService, UserBulkService],
    providers: [UserService, UserBulkService],
    controllers: [],
})
export class UserModule {}
