import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ApiKeyRepository],
    exports: [ApiKeyRepository],
    imports: [],
})
export class ApiKeyRepositoryModule {}
