import { DynamicModule, Global, Module } from '@nestjs/common';
import { AuthJwtAccessStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthJwtRefreshStrategy } from '@modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthUtil } from '@modules/auth/utils/auth.util';

@Global()
@Module({})
export class AuthModule {
    static forRoot(): DynamicModule {
        return {
            module: AuthModule,
            providers: [
                AuthJwtAccessStrategy,
                AuthJwtRefreshStrategy,
                AuthUtil,
            ],
            exports: [AuthUtil],
            controllers: [],
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
