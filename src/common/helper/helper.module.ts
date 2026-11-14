import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';

/** Shared module: the Helper array, encryption, hash, number, string, and date services for every util, service, and use case. */
@Global()
@Module({})
export class HelperModule {
    static forRoot(): DynamicModule {
        return {
            module: HelperModule,
            controllers: [],
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
        };
    }
}
