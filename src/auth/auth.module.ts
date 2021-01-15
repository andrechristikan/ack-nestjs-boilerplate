import { Module } from '@nestjs/common';
import { AuthService } from 'auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JWT_SECRET_KEY, JWT_EXPIRATION_TIME } from 'auth/auth.constant';
import { JwtStrategy } from 'auth/guard/jwt/jwt.strategy';
import { UserModule } from 'user/user.module';
import { AuthController } from 'auth/auth.controller';
import { ConfigService } from 'config/config.service';
import { ConfigModule } from 'config/config.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from 'auth/guard/local/local.strategy';

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
                        configService.getEnv('JWT_SECRET_KEY') ||
                        JWT_SECRET_KEY,
                    signOptions: {
                        expiresIn:
                            configService.getEnv('JWT_EXPIRATION_TIME') ||
                            JWT_EXPIRATION_TIME
                    }
                };
            }
        })
    ]
})
export class AuthModule {}
