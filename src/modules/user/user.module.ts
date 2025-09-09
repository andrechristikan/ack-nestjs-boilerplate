import { Module } from '@nestjs/common';
import { UserService } from '@modules/user/services/user.service';
import { UserUtil } from '@modules/user/utils/user.util';

@Module({
    imports: [],
    exports: [UserService, UserUtil],
    providers: [UserService, UserUtil],
    controllers: [],
})
export class UserModule {}
