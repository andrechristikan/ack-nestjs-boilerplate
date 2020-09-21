import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserSchema } from 'user/user.model';
import { UserService } from 'user/user.service';
import { UserController } from 'user/user.controller';
import { AuthModule } from 'auth/auth.module';
import { CountrySchema } from 'country/country.model';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: 'user', schema: UserSchema },
            { name: 'country', schema: CountrySchema },
        ]),
        AuthModule,
    ],
    exports: [UserService],
    providers: [UserService],
    controllers: [UserController],
})
export class UserModule {}
