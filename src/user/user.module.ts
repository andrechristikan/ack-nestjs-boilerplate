import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserEntity, UserDatabaseName, UserSchema } from 'user/user.schema';
import { UserService } from 'user/user.service';
import { UserController } from 'user/user.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: UserEntity.name,
                schema: UserSchema,
                collection: UserDatabaseName
            }
        ]),
    ],
    exports: [UserService],
    providers: [UserService],
    controllers: [UserController]
})
export class UserModule {}
