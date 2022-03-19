import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/database/database.constant';
import { UserService } from './service/user.service';
import { UserBulkService } from './service/user.bulk.service';
import { UserDatabaseName, UserEntity, UserSchema } from './schema/user.schema';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: UserEntity.name,
                    schema: UserSchema,
                    collection: UserDatabaseName,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
    exports: [UserService, UserBulkService],
    providers: [UserService, UserBulkService],
    controllers: [],
})
export class UserModule {}
