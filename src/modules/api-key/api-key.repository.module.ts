import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { Global, Module } from '@nestjs/common';

/**
 * Global so API key persistence is reachable from any module context.
 */
@Global()
@Module({
    controllers: [],
    providers: [ApiKeyRepository],
    exports: [ApiKeyRepository],
    imports: [],
})
export class ApiKeyRepositoryModule {}
