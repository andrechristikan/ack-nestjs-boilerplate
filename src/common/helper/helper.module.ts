import { DynamicModule, Global, Module } from '@nestjs/common';
import { HelperService } from '@common/helper/services/helper.service';

/**
 * Global dynamic module providing helper utility services.
 * Exports HelperService globally for use throughout the application.
 */
@Global()
@Module({})
export class HelperModule {
    static forRoot(): DynamicModule {
        return {
            module: HelperModule,
            providers: [HelperService],
            exports: [HelperService],
            controllers: [],
            imports: [],
        };
    }
}
