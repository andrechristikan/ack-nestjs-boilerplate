import { Module } from '@nestjs/common';
import { UserRepositoryModule } from 'src/modules/user/repository/user.repository.module';
import { UserBulkService } from './services/user.bulk.service';
import { UserService } from './services/user.service';
@Module({
    imports: [UserRepositoryModule],
    exports: [UserService, UserBulkService],
    providers: [UserService, UserBulkService],
    controllers: [],
})
export class UserModule {}
