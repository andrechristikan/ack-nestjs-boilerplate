import { Module } from '@nestjs/common';
import { UserRepositoryModule } from 'src/modules/user/repository/user.repository.module';
import { UserService } from './services/user.service';
import { UserHistoryService } from 'src/modules/user/services/user-history.service';
import { UserPasswordService } from 'src/modules/user/services/user-password.service';
import { UserLoginHistoryService } from 'src/modules/user/services/user-login-history.service';

@Module({
    imports: [UserRepositoryModule],
    exports: [
        UserService,
        UserHistoryService,
        UserPasswordService,
        UserLoginHistoryService,
    ],
    providers: [
        UserService,
        UserHistoryService,
        UserPasswordService,
        UserLoginHistoryService,
    ],
    controllers: [],
})
export class UserModule {}
