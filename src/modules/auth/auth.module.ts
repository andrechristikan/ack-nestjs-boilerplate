import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { AuthCommonPasswordRepository } from '@modules/auth/repositories/auth.common-password.repository';
import { AuthSocialNonceRepository } from '@modules/auth/repositories/auth.social-nonce.repository';
import { AuthService } from '@modules/auth/services/auth.service';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { AuthSocialService } from '@modules/auth/services/auth.social.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';

/** Shared module: AuthService for the JWT and social guards; AuthJwtService for the user module and use cases; AuthPasswordService for the user module and use cases and the user seed; AuthSocialService for the auth use cases; AuthPasswordUtil for the user use cases. */
@Global()
@Module({})
export class AuthModule {
    static forRoot(): DynamicModule {
        return {
            module: AuthModule,
            controllers: [],
            providers: [
                AuthJwtAccessStrategy,
                AuthJwtRefreshStrategy,
                AuthService,
                AuthJwtService,
                AuthCommonPasswordRepository,
                AuthSocialNonceRepository,
                AuthPasswordService,
                AuthPasswordUtil,
                AuthSocialService,
            ],
            exports: [
                AuthService,
                AuthJwtService,
                AuthPasswordService,
                AuthPasswordUtil,
                AuthSocialService,
            ],
            imports: [
                JwtModule.registerAsync({
                    inject: [ConfigService],
                    imports: [ConfigModule],
                    useFactory: (
                        configService: ConfigService
                    ): JwtModuleOptions => ({
                        signOptions: {
                            audience:
                                configService.get<string>('auth.jwt.audience'),
                            issuer: configService.get<string>(
                                'auth.jwt.issuer'
                            ),
                        },
                    }),
                }),
            ],
        };
    }
}
