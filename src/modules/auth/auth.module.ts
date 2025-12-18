import { Global, Module } from '@nestjs/common';
import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { AuthService } from '@modules/auth/services/auth.service';
import { AuthTwoFactorService } from '@modules/auth/services/auth-two-factor.service';
import { SessionModule } from '@modules/session/session.module';

@Global()
@Module({
    providers: [
        AuthJwtAccessStrategy,
        AuthJwtRefreshStrategy,
        AuthUtil,
        AuthService,
        AuthTwoFactorService,
    ],
    exports: [AuthUtil, AuthService, AuthTwoFactorService],
    controllers: [],
    imports: [
        SessionModule,
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
