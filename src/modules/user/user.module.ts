import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserRepositoryModule } from 'src/modules/user/repository/user.repository.module';

@Module({
    imports: [UserRepositoryModule],
    exports: [UserService],
    providers: [UserService],
    controllers: [],
})
export class UserModule {}
