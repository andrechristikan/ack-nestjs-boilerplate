import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';

@Module({
    providers: [AuthUtil, AuthTwoFactorUtil],
    exports: [AuthUtil, AuthTwoFactorUtil],
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
export class AuthSharedModule {}
