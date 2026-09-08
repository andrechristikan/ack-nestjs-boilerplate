import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { AuthService } from '@modules/auth/services/auth.service';
import { AuthSocialService } from '@modules/auth/services/auth.social.service';
import { AuthCacheService } from '@modules/auth/services/auth.cache.service';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';

/**
 * Global auth module: registers the strategies, the auth domain service, and the token
 * signing, password hashing and two-factor helpers.
 */
@Global()
@Module({
    controllers: [],
    providers: [
        AuthJwtAccessStrategy,
        AuthJwtRefreshStrategy,
        AuthService,
        AuthJwtService,
        AuthPasswordService,
        AuthSocialService,
        AuthTwoFactorService,
        AuthCacheService,
        AuthUtil,
        AuthTwoFactorUtil,
    ],
    exports: [
        AuthService,
        AuthJwtService,
        AuthPasswordService,
        AuthTwoFactorService,
        AuthCacheService,
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
