import { Global, Module } from '@nestjs/common';
import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { AuthService } from '@modules/auth/services/auth.service';
import { SessionModule } from '@modules/session/session.module';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { IsTwoFactorBackupCodeConstraint } from '@modules/auth/validations/auth.two-factor-backup-code.validation';
import { IsTwoFactorCodeConstraint } from '@modules/auth/validations/auth.two-factor-code.validation';

@Global()
@Module({
    providers: [
        AuthJwtAccessStrategy,
        AuthJwtRefreshStrategy,
        AuthUtil,
        AuthTwoFactorUtil,
        AuthService,

        IsTwoFactorCodeConstraint,
        IsTwoFactorBackupCodeConstraint,
    ],
    exports: [AuthUtil, AuthTwoFactorUtil, AuthService],
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
