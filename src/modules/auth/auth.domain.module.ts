import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { AuthCache } from '@modules/auth/caches/auth.cache';
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import { AuthJwtDomain } from '@modules/auth/domains/auth.jwt.domain';
import { AuthSocialDomain } from '@modules/auth/domains/auth.social.domain';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';

/**
 * Global auth module: registers the strategies, the auth domain, and the token
 * signing, password hashing and two-factor helpers.
 */
@Global()
@Module({
    controllers: [],
    providers: [
        AuthJwtAccessStrategy,
        AuthJwtRefreshStrategy,
        AuthDomain,
        AuthJwtDomain,
        AuthPasswordUtil,
        AuthSocialDomain,
        AuthTwoFactorDomain,
        AuthCache,
        AuthUtil,
        AuthTwoFactorUtil,
    ],
    exports: [
        AuthDomain,
        AuthJwtDomain,
        AuthPasswordUtil,
        AuthTwoFactorDomain,
        AuthCache,
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
export class AuthDomainModule {}
