import { DynamicModule, Module } from '@nestjs/common';
import { HelperService } from '@common/helper/services/helper.service';

/**
 * Global module providing helper utility services.
 * Exports HelperService globally for use throughout the application.
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
