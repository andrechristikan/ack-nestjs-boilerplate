import { Global, Module } from '@nestjs/common';
import { HashService } from 'src/hash/hash.service';
import { JwtModule } from '@nestjs/jwt';
import {
    AUTH_JWT_SECRET_KEY,
    AUTH_JWT_EXPIRATION_TIME
} from 'src/auth/auth.constant';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
    providers: [
        {
            provide: 'HashService',
            useClass: HashService
        }
    ],
    exports: [HashService],
    imports: [
        JwtModule.registerAsync({
            inject: [ConfigService],
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                return {
                    secret:
                        configService.get<string>('AUTH_JWT_SECRET_KEY') ||
                        AUTH_JWT_SECRET_KEY,
                    signOptions: {
                        expiresIn:
                            configService.get<string>(
                                'AUTH_JWT_EXPIRATION_TIME'
                            ) || AUTH_JWT_EXPIRATION_TIME
                    }
                };
            }
        })
    ]
})
export class HashModule {}
