import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserSchema } from 'components/user/user.model';
import { UserService } from 'components/user/user.service';
import { UserController } from 'components/user/user.controller';
import { AuthModule } from 'auth/auth.module';
import { CountrySchema } from 'components/country/country.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: 'user', schema: UserSchema },
            { name: 'country', schema: CountrySchema }
        ]),
        AuthModule
    ],
    exports: [UserService],
    providers: [UserService],
    controllers: [UserController]
})
export class UserModule {}
