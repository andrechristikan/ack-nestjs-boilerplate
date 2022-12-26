import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HelperArrayService } from './services/helper.array.service';
import { HelperDateService } from './services/helper.date.service';
import { HelperEncryptionService } from './services/helper.encryption.service';
import { HelperHashService } from './services/helper.hash.service';
import { HelperNumberService } from './services/helper.number.service';
import { HelperStringService } from './services/helper.string.service';
import { HelperFileService } from './services/helper.file.service';
import { HelperGeoService } from './services/helper.geo.service';

@Global()
@Module({
    providers: [
        HelperArrayService,
        HelperDateService,
        HelperEncryptionService,
        HelperHashService,
        HelperNumberService,
        HelperStringService,
        HelperFileService,
        HelperGeoService,
    ],
    exports: [
        HelperArrayService,
        HelperDateService,
        HelperEncryptionService,
        HelperHashService,
        HelperNumberService,
        HelperStringService,
        HelperFileService,
        HelperGeoService,
    ],
    controllers: [],
    imports: [
        JwtModule.registerAsync({
            inject: [ConfigService],
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>(
                    'helper.jwt.defaultSecretKey'
                ),
                signOptions: {
                    expiresIn: configService.get<string>(
                        'helper.jwt.defaultExpirationTime'
                    ),
                },
            }),
        }),
    ],
})
export class HelperModule {}
