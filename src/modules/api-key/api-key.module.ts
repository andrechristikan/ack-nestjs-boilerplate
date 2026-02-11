import { Global, Module } from '@nestjs/common';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';

@Global()
@Module({
    providers: [ApiKeyService, ApiKeyRepository, ApiKeyUtil],
    exports: [ApiKeyService, ApiKeyRepository, ApiKeyUtil],
    imports: [],
})
export class ApiKeyModule {}
