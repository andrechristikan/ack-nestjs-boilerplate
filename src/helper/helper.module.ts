import { Global, Module } from '@nestjs/common';
import { HelperService } from './helper.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
    providers: [HelperService],
    exports: [HelperService],
    controllers: [],
    imports: [
        JwtModule.registerAsync({
            inject: [ConfigService],
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                return {
                    secret: configService.get<string>(
                        'helper.jwt.defaultSecretKey'
                    ),
                    signOptions: {
                        expiresIn: configService.get<string>(
                            'helper.jwt.defaultExpirationTime'
                        )
                    }
                };
            }
        })
    ]
})
export class HelperModule {}
