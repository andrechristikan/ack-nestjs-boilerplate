import { Global, Module } from '@nestjs/common';
import { HashService } from 'src/hash/hash.service';
import { JwtModule } from '@nestjs/jwt';
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
                    secret: configService.get<string>('auth.jwtSecretKey'),
                    signOptions: {
                        expiresIn: configService.get<string>(
                            'auth.jwtExpirationTime'
                        )
                    }
                };
            }
        })
    ]
})
export class HashModule {}
