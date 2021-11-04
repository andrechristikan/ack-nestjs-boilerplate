import { Module } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { JwtStrategy } from 'src/auth/guard/jwt/jwt.strategy';
import { UserModule } from 'src/user/user.module';
import { AuthController } from 'src/auth/auth.controller';
import { JwtRefreshStrategy } from './guard/jwt-refresh/jwt-refresh.strategy';
import { LoggerModule } from 'src/logger/logger.module';

@Module({
    providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
    exports: [AuthService],
    controllers: [AuthController],
    imports: [UserModule, LoggerModule]
})
export class AuthModule {}
