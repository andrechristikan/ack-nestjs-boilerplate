import { ApiKeyRepositoryModule } from '@modules/api-key/api-key.repository.module';
import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { Global, Module } from '@nestjs/common';
import { ApiKeyAnalyticDomain } from '@modules/api-key/domains/api-key.analytic.domain';

/**
 * Global so the x-api-key guards and the seeds reach the API key domain service and util
 * app-wide.
 */
@Global()
@Module({
    controllers: [],
    providers: [
        ApiKeyDomain,
        ApiKeyCredentialUtil,
        ApiKeyCache,
        ApiKeyUtil,
        ApiKeyAnalyticDomain,
    ],
    exports: [
        ApiKeyDomain,
        ApiKeyCredentialUtil,
        ApiKeyCache,
        ApiKeyUtil,
        ApiKeyAnalyticDomain,
    ],
    imports: [ApiKeyRepositoryModule],
})
export class ApiKeyDomainModule {}
