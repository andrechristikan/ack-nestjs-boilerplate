import { Module } from '@nestjs/common';
import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from '@modules/auth/services/auth.service';
import { IsTwoFactorBackupCodeConstraint } from '@modules/auth/validations/auth.two-factor-backup-code.validation';
import { IsTwoFactorCodeConstraint } from '@modules/auth/validations/auth.two-factor-code.validation';
import { AuthSharedModule } from '@modules/auth/auth.shared.module';
import { SessionSharedModule } from '@modules/session/session.shared.module';

@Module({
    providers: [
        AuthJwtAccessStrategy,
        AuthJwtRefreshStrategy,
        AuthService,

        IsTwoFactorCodeConstraint,
        IsTwoFactorBackupCodeConstraint,
    ],
    exports: [AuthService],
    controllers: [],
    imports: [
        SessionSharedModule,
        AuthSharedModule,
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
