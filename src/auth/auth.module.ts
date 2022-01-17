import { Module } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { JwtStrategy } from 'src/auth/guard/jwt/auth.jwt.strategy';

import { JwtRefreshStrategy } from './guard/jwt-refresh/auth.jwt-refresh.strategy';

@Module({
    providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
    exports: [AuthService],
    controllers: [],
    imports: [],
})
export class AuthModule {}
