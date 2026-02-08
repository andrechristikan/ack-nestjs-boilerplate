import { Module } from '@nestjs/common';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserRepository } from '@modules/user/repositories/user.repository';

@Module({
    imports: [],
    exports: [UserRepository, UserUtil],
    providers: [UserRepository, UserUtil],
    controllers: [],
})
export class UserSharedModule {}
