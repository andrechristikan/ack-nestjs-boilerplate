import { ApiKeyRepositoryModule } from '@modules/api-key/api-key.repository.module';
import { ApiKeyUtilModule } from '@modules/api-key/api-key.util.module';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { Global, Module } from '@nestjs/common';

/**
 * Global so the x-api-key guards reach the API key domain service app-wide.
 */
@Global()
@Module({
    controllers: [],
    providers: [ApiKeyService],
    exports: [ApiKeyService],
    imports: [ApiKeyRepositoryModule, ApiKeyUtilModule],
})
export class ApiKeyModule {}
