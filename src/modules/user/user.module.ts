import { Module } from '@nestjs/common';
import { UserRepositoryModule } from 'src/modules/user/repository/user.repository.module';
import { UserService } from './services/user.service';
import { UserHistoryService } from 'src/modules/user/services/user-history.service';

@Module({
    imports: [UserRepositoryModule],
    exports: [UserService, UserHistoryService],
    providers: [UserService, UserHistoryService],
    controllers: [],
})
export class UserModule {}
