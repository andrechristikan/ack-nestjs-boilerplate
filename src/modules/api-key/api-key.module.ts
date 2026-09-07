import { ApiKeyRepositoryModule } from '@modules/api-key/api-key.repository.module';
import { ApiKeyCacheService } from '@modules/api-key/services/api-key.cache.service';
import { ApiKeyCredentialService } from '@modules/api-key/services/api-key.credential.service';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { Global, Module } from '@nestjs/common';

/**
 * Global so the x-api-key guards and the seeds reach the API key domain service and util
 * app-wide.
 */
@Global()
@Module({
    controllers: [],
    providers: [
        ApiKeyService,
        ApiKeyCredentialService,
        ApiKeyCacheService,
        ApiKeyUtil,
    ],
    exports: [
        ApiKeyService,
        ApiKeyCredentialService,
        ApiKeyCacheService,
        ApiKeyUtil,
    ],
    imports: [ApiKeyRepositoryModule],
})
export class ApiKeyModule {}
