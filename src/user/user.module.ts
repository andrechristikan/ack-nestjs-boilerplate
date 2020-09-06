import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserSchema } from 'user/user.model';
import { UserService } from 'user/user.service';
import { UserController } from 'user/user.controller';
import { AuthModule } from 'auth/auth.module';
import { ErrorModule } from 'error/error.module';
import { HelperModule } from 'helper/helper.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'users', schema: UserSchema }]),
        AuthModule,
        ErrorModule,
        HelperModule
    ],
    exports: [UserService],
    providers: [UserService],
    controllers: [UserController],
})
export class UserModule {}
