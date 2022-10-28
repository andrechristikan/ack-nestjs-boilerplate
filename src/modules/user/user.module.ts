import { Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseConnectModule } from 'src/common/database/database.module';
import { UserBulkRepository } from './repositories/user.bulk.repository';
import { UserRepository } from './repositories/user.repository';
import { UserDatabaseName, UserEntity, User } from './schemas/user.schema';
import { UserBulkService } from './services/user.bulk.service';
import { UserService } from './services/user.service';
@Module({
    imports: [
        DatabaseConnectModule.register({
            name: UserEntity.name,
            schema: User,
            collection: UserDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
    exports: [UserService, UserBulkService],
    providers: [
        UserService,
        UserBulkService,
        UserRepository,
        UserBulkRepository,
    ],
    controllers: [],
})
export class UserModule {}
