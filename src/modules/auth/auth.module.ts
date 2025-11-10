import { DynamicModule, Module } from '@nestjs/common';
import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Algorithm } from 'jsonwebtoken';
import { AuthUtil } from '@modules/auth/utils/auth.util';

@Module({
    providers: [AuthUtil],
    exports: [AuthUtil],
    controllers: [],
    imports: [
        JwtModule.registerAsync({
            inject: [ConfigService],
            imports: [ConfigModule],
            useFactory: (configService: ConfigService): JwtModuleOptions => ({
                signOptions: {
                    audience: configService.get<string>('auth.jwt.audience'),
                    issuer: configService.get<string>('auth.jwt.issuer'),
                    algorithm:
                        configService.get<Algorithm>('auth.jwt.algorithm'),
                },
            }),
        }),
    ],
})
export class AuthModule {
    static forRoot(): DynamicModule {
        return {
            module: AuthModule,
            providers: [AuthJwtAccessStrategy, AuthJwtRefreshStrategy],
            exports: [],
            controllers: [],
            imports: [],
        };
    }
}
