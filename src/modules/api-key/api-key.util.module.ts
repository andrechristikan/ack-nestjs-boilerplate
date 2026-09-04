import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { Global, Module } from '@nestjs/common';

/**
 * Global so the x-api-key guards and the seeds reach the util from any module context.
 */
@Global()
@Module({
    controllers: [],
    providers: [ApiKeyUtil],
    exports: [ApiKeyUtil],
    imports: [],
})
export class ApiKeyUtilModule {}
