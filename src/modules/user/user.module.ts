import { Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseConnectModule } from 'src/common/database/database.module';
import { UserRepository } from './repositories/user.repository';
import {
    UserDatabaseName,
    UserEntity,
    UserSchema,
} from './schemas/user.schema';
import { UserBulkService } from './services/user.bulk.service';
import { UserService } from './services/user.service';
@Module({
    imports: [
        DatabaseConnectModule.register({
            name: UserEntity.name,
            schema: { mongo: UserSchema },
            collection: UserDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
    exports: [UserService, UserBulkService],
    providers: [UserService, UserBulkService, UserRepository],
    controllers: [],
})
export class UserModule {}
