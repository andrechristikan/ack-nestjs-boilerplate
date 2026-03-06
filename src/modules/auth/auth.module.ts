import { Global, Module } from '@nestjs/common';
import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from '@modules/auth/services/auth.service';
import { IsTwoFactorBackupCodeConstraint } from '@modules/auth/validations/auth.two-factor-backup-code.validation';
import { IsTwoFactorCodeConstraint } from '@modules/auth/validations/auth.two-factor-code.validation';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';

@Global()
@Module({
    providers: [
        IsTwoFactorCodeConstraint,
        IsTwoFactorBackupCodeConstraint,
        AuthJwtAccessStrategy,
        AuthJwtRefreshStrategy,

        AuthService,
        AuthUtil,
        AuthTwoFactorUtil,
    ],
    exports: [AuthService, AuthUtil, AuthTwoFactorUtil],
    controllers: [],
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
