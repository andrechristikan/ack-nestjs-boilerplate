import { DynamicModule, Module } from '@nestjs/common';
import { HelperService } from '@common/helper/services/helper.service';

/**
 * Global module exposing `HelperService` (array, crypto, hashing, date, string utils) app-wide.
 */
@Module({})
export class HelperModule {
    static forRoot(): DynamicModule {
        return {
            module: HelperModule,
            global: true,
            providers: [HelperService],
            exports: [HelperService],
            imports: [],
            controllers: [],
        };
    }
}
