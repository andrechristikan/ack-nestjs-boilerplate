import { DynamicModule, Module } from '@nestjs/common';
import { AuthJwtAccessStrategy } from 'src/common/auth/guards/jwt-access/auth.jwt-access.strategy';
import { AuthJwtRefreshStrategy } from 'src/common/auth/guards/jwt-refresh/auth.jwt-refresh.strategy';
import { AuthService } from 'src/common/auth/services/auth.service';
import { AuthGoogleOAuth2LoginStrategy } from './guards/google-oauth2/auth.google-oauth2-login.strategy';
import { AuthGoogleOAuth2SignUpStrategy } from './guards/google-oauth2/auth.google-oath2-sign-up.strategy';

@Module({
    providers: [AuthService],
    exports: [AuthService],
    controllers: [],
    imports: [],
})
export class AuthModule {
    static forRoot(): DynamicModule {
        return {
            module: AuthModule,
            providers: [
                AuthJwtAccessStrategy,
                AuthJwtRefreshStrategy,
                AuthGoogleOAuth2SignUpStrategy,
                AuthGoogleOAuth2LoginStrategy,
            ],
            exports: [],
            controllers: [],
            imports: [],
        };
    }
}
