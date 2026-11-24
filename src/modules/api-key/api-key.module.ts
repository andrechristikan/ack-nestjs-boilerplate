import { ApiKeyCache } from '@modules/api-key/caches/api-key.cache';
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';

/** Shared module: ApiKeyService for the x-api-key guards and the API key admin use cases, ApiKeyUtil for those use cases, ApiKeyCredentialUtil for the API key seed. */
@Global()
@Module({})
export class ApiKeyModule {
    static forRoot(): DynamicModule {
        return {
            module: ApiKeyModule,
            controllers: [],
            providers: [
                ApiKeyRepository,
                ApiKeyService,
                ApiKeyCredentialUtil,
                ApiKeyCache,
                ApiKeyUtil,
            ],
            exports: [ApiKeyService, ApiKeyCredentialUtil, ApiKeyUtil],
            imports: [],
        };
    }
}
