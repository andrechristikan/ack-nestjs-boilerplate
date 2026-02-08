import { Module } from '@nestjs/common';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';

@Module({
    providers: [ApiKeyRepository, ApiKeyUtil],
    exports: [ApiKeyRepository, ApiKeyUtil],
    imports: [],
})
export class ApiKeySharedModule {}
