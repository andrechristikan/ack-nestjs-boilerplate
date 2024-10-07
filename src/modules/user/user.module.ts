import { Module } from '@nestjs/common';
import { UserRepositoryModule } from 'src/modules/user/repository/user.repository.module';
import { UserService } from 'src/modules/user/services/user.service';

@Module({
    imports: [UserRepositoryModule],
    exports: [UserService],
    providers: [UserService],
    controllers: [],
})
export class UserModule {}
