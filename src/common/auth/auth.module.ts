import { Module } from '@nestjs/common';
import { AuthGoogleOAuth2Strategy } from 'src/common/auth/guards/google-oauth2/auth.google-oauth2.strategy';
import { AuthJwtAccessStrategy } from 'src/common/auth/guards/jwt-access/auth.jwt-access.strategy';
import { AuthJwtRefreshStrategy } from 'src/common/auth/guards/jwt-refresh/auth.jwt-refresh.strategy';
import { AuthService } from 'src/common/auth/services/auth.service';

@Module({
    providers: [
        AuthService,
        AuthJwtAccessStrategy,
        AuthJwtRefreshStrategy,
        AuthGoogleOAuth2Strategy,
    ],
    exports: [AuthService],
    controllers: [],
    imports: [],
})
export class AuthModule {}
