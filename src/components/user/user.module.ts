import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserSchema } from 'components/user/user.model';
import { UserService } from 'components/user/user.service';
import { UserController } from 'components/user/user.controller';
import { AuthModule } from 'components/auth/auth.module';
import { ErrorModule } from 'components/error/error.module';
import { ResponseModule } from 'common/response/response.module';
import { CountrySchema } from 'components/country/country.model';
import { LanguageModule } from 'components/language/language.module';

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
