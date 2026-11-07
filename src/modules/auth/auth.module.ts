import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import { AuthService } from '@modules/auth/services/auth.service';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { AuthSocialService } from '@modules/auth/services/auth.social.service';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';

/** Shared module: AuthService for the JWT and social guards; AuthJwtService, AuthTwoFactorService, and AuthUtil for the user use cases; AuthPasswordUtil for the user and password-history modules and the user seed; AuthTwoFactorUtil for the user module. */
@Global()
@Module({
    controllers: [],
    providers: [
        AuthJwtAccessStrategy,
        AuthJwtRefreshStrategy,
        AuthService,
        AuthJwtService,
        AuthPasswordUtil,
        AuthSocialService,
        AuthTwoFactorService,
        AuthCache,
        AuthUtil,
        AuthTwoFactorUtil,
    ],
    exports: [
        AuthService,
        AuthJwtService,
        AuthPasswordUtil,
        AuthTwoFactorService,
        AuthTwoFactorUtil,
        AuthUtil,
    ],
    imports: [
        JwtModule.registerAsync({
            inject: [ConfigService],
            imports: [ConfigModule],
            useFactory: (configService: ConfigService): JwtModuleOptions => ({
                signOptions: {
                    audience: configService.get<string>('auth.jwt.audience'),
                    issuer: configService.get<string>('auth.jwt.issuer'),
                },
            }),
        }),
    ],
})
export class AuthModule {}
