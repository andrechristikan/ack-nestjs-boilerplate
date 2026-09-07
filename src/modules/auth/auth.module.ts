import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { AuthService } from '@modules/auth/services/auth.service';
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
        AuthUtil,
        AuthTwoFactorUtil,
    ],
    exports: [AuthService, AuthUtil, AuthTwoFactorUtil],
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
