import { Module } from '@nestjs/common';
import { UserRepositoryModule } from 'src/modules/user/repository/user.repository.module';
import { UserService } from './services/user.service';
import { UserHistoryService } from 'src/modules/user/services/user-history.service';
import { UserPasswordService } from 'src/modules/user/services/user-password.service';

@Module({
    imports: [UserRepositoryModule],
    exports: [UserService, UserHistoryService, UserPasswordService],
    providers: [UserService, UserHistoryService, UserPasswordService],
    controllers: [],
})
export class UserModule {}
