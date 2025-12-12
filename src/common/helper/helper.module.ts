import { Global, Module } from '@nestjs/common';
import { HelperService } from '@common/helper/services/helper.service';

/**
 * Global module providing helper utility services.
 * Exports HelperService globally for use throughout the application.
 */
@Global()
@Module({
    providers: [HelperService],
    exports: [HelperService],
    controllers: [],
    imports: [],
})
export class HelperModule {}
