import { ApiKeyRepositoryModule } from '@modules/api-key/api-key.repository.module';
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
    providers: [ApiKeyService, ApiKeyUtil],
    exports: [ApiKeyService, ApiKeyUtil],
    imports: [ApiKeyRepositoryModule],
})
export class ApiKeyModule {}
