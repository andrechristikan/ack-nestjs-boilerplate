import { Module } from '@nestjs/common';
import { AuthService } from 'auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import {
    AUTH_JWT_SECRET_KEY,
    AUTH_JWT_EXPIRATION_TIME
} from 'auth/auth.constant';
import { JwtStrategy } from 'auth/guard/jwt/jwt.strategy';
import { UserModule } from 'user/user.module';
import { AuthController } from 'auth/auth.controller';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from 'auth/guard/local/local.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    providers: [AuthService, JwtStrategy, LocalStrategy],
    exports: [AuthService],
    controllers: [AuthController],
    imports: [
        UserModule,
        PassportModule.register({
            defaultStrategy: 'local'
        }),
        JwtModule.registerAsync({
            inject: [ConfigService],
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                return {
                    secret:
                        configService.get('app.auth.jwtSecretKey') ||
                        AUTH_JWT_SECRET_KEY,
                    signOptions: {
                        expiresIn:
                            configService.get('app.auth.jwtExpiration') ||
                            AUTH_JWT_EXPIRATION_TIME
                    }
                };
            }
        })
    ]
})
export class AuthModule {}
