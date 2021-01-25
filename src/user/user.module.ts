import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserDatabaseName, UserSchema } from 'user/user.schema';
import { UserService } from 'user/user.service';
import { UserController } from 'user/user.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: UserDatabaseName, schema: UserSchema }
        ])
    ],
    exports: [UserService],
    providers: [UserService],
    controllers: [UserController]
})
export class UserModule {}
