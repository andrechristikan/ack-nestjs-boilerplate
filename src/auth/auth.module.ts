import { Module } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import {
    AUTH_JWT_SECRET_KEY,
    AUTH_JWT_EXPIRATION_TIME
} from 'src/auth/auth.constant';
import { JwtStrategy } from 'src/auth/guard/jwt/jwt.strategy';
import { UserModule } from 'src/user/user.module';
import { AuthController } from 'src/auth/auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
    controllers: [AuthController],
    imports: [
        UserModule,
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
