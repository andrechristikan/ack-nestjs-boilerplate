import { Module } from '@nestjs/common';
import { AuthJwtAccessStrategy } from 'src/common/auth/guards/jwt-access/auth.jwt-access.strategy';
import { AuthJwtRefreshStrategy } from 'src/common/auth/guards/jwt-refresh/auth.jwt-refresh.strategy';
import { AuthService } from 'src/common/auth/services/auth.service';
import { UserRepository } from 'src/modules/user/repository/repositories/user.repository';
import { UserRepositoryModule } from 'src/modules/user/repository/user.repository.module';

@Module({
    providers: [AuthService, AuthJwtAccessStrategy, AuthJwtRefreshStrategy],
    exports: [AuthService],
    controllers: [],
    imports: [UserRepositoryModule],
})
export class AuthModule {}
