import { Module } from '@nestjs/common';
import { UserRepositoryModule } from 'src/modules/user/repository/user.repository.module';
import { UserUseCase } from 'src/modules/user/use-cases/user.use-case';
import { UserBulkService } from './services/user.bulk.service';
import { UserService } from './services/user.service';
@Module({
    imports: [UserRepositoryModule],
    exports: [UserService, UserBulkService, UserUseCase],
    providers: [UserService, UserBulkService, UserUseCase],
    controllers: [],
})
export class UserModule {}
