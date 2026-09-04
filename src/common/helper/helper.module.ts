import { DynamicModule, Module } from '@nestjs/common';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';

/**
 * Global module exposing the helper kit (array, encryption, hashing, number, string, date) app-wide.
 */
@Module({})
export class HelperModule {
    static forRoot(): DynamicModule {
        return {
            module: HelperModule,
            global: true,
            providers: [
                HelperArrayService,
                HelperEncryptionService,
                HelperHashService,
                HelperNumberService,
                HelperStringService,
                HelperDateService,
            ],
            exports: [
                HelperArrayService,
                HelperEncryptionService,
                HelperHashService,
                HelperNumberService,
                HelperStringService,
                HelperDateService,
            ],
            imports: [],
            controllers: [],
        };
    }
}
