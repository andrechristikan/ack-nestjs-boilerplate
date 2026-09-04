import { AuthUtilModule } from '@modules/auth/auth.util.module';
import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { AuthService } from '@modules/auth/services/auth.service';
import { IsTwoFactorBackupCodeConstraint } from '@modules/auth/validations/auth.two-factor-backup-code.validation';
import { IsTwoFactorCodeConstraint } from '@modules/auth/validations/auth.two-factor-code.validation';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';

/** Global auth module: registers JWT, strategies, 2FA validators, and the auth domain service. */
@Global()
@Module({
    controllers: [],
    providers: [
        IsTwoFactorCodeConstraint,
        IsTwoFactorBackupCodeConstraint,
        AuthJwtAccessStrategy,
        AuthJwtRefreshStrategy,

        AuthService,
    ],
    exports: [AuthService],
    imports: [
        AuthUtilModule,
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
