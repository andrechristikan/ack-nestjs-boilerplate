import { Module } from '@nestjs/common';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';

@Module({
    providers: [ApiKeyService, ApiKeyUtil, ApiKeyRepository],
    exports: [ApiKeyService, ApiKeyUtil, ApiKeyRepository],
    controllers: [],
    imports: [],
})
export class ApiKeyModule {}
