import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserSchema } from 'user/user.schema';
import { UserService } from 'user/user.service';
import { UserController } from 'user/user.controller';
import { CountrySchema } from 'country/country.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: 'user', schema: UserSchema },
            { name: 'country', schema: CountrySchema }
        ]),
    ],
    exports: [UserService],
    providers: [UserService],
    controllers: [UserController]
})
export class UserModule {}
