import { DynamicModule, Global, Module } from '@nestjs/common';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';

@Global()
@Module({})
export class HelperModule {
    static forRoot(): DynamicModule {
        return {
            module: HelperModule,
            providers: [
                HelperArrayService,
                HelperDateService,
                HelperEncryptionService,
                HelperHashService,
                HelperNumberService,
                HelperStringService,
            ],
            exports: [
                HelperArrayService,
                HelperDateService,
                HelperEncryptionService,
                HelperHashService,
                HelperNumberService,
                HelperStringService,
            ],
            controllers: [],
            imports: [],
        };
    }
}
