import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserSchema } from 'user/user.model';
import { UserService } from 'user/user.service';
import { UserController } from 'user/user.controller';
import { AuthModule } from 'auth/auth.module';
import { ErrorModule } from 'error/error.module';
import { ResponseModule } from 'helper/response/response.module';
import { CountrySchema } from 'country/country.model';
import { LanguageModule } from 'language/language.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: 'user', schema: UserSchema },
            { name: 'country', schema: CountrySchema },
        ]),
        AuthModule,
        ErrorModule,
        ResponseModule,
        LanguageModule,
    ],
    exports: [UserService],
    providers: [UserService],
    controllers: [UserController],
})
export class UserModule {}
