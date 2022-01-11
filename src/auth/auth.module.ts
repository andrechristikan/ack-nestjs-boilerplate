import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { JwtStrategy } from 'src/auth/guard/jwt/auth.jwt.strategy';
import { UserModule } from 'src/user/user.module';
import { AuthController } from 'src/auth/auth.controller';
import { JwtRefreshStrategy } from './guard/jwt-refresh/auth.jwt-refresh.strategy';
import { LoggerModule } from 'src/logger/logger.module';
import { MessageModule } from 'src/message/message.module';
import { RoleModule } from 'src/role/role.module';

@Module({
    providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
    exports: [AuthService],
    controllers: [AuthController],
    imports: [
        LoggerModule,
        MessageModule,
        RoleModule,
        forwardRef(() => UserModule)
    ]
})
export class AuthModule {}
