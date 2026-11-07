import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import { ApiKeyAnalyticRepository } from '@modules/api-key/repositories/api-key.analytic.repository';
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { ApiKeyAnalyticService } from '@modules/api-key/services/api-key.analytic.service';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { Global, Module } from '@nestjs/common';

/** Shared module: ApiKeyService for the x-api-key guards, ApiKeyAnalyticService for the analytic services, ApiKeyCredentialUtil and ApiKeyCache for the API key seed. */
@Global()
@Module({
    controllers: [],
    providers: [
        ApiKeyRepository,
        ApiKeyAnalyticRepository,
        ApiKeyService,
        ApiKeyCredentialUtil,
        ApiKeyCache,
        ApiKeyUtil,
        ApiKeyAnalyticService,
    ],
    exports: [
        ApiKeyService,
        ApiKeyCredentialUtil,
        ApiKeyCache,
        ApiKeyUtil,
        ApiKeyAnalyticService,
    ],
    imports: [],
})
export class ApiKeyModule {}
