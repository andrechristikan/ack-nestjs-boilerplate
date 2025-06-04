import { Module } from '@nestjs/common';
import { UserRepositoryModule } from '@module/user/repository/user.repository.module';
import { UserService } from '@module/user/services/user.service';

@Module({
    imports: [UserRepositoryModule],
    exports: [UserService],
    providers: [UserService],
    controllers: [],
})
export class UserModule {}
