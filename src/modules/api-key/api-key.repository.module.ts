import { ApiKeyRepository } from '@modules/api-key/repositories/api-key.repository';
import { Module } from '@nestjs/common';
import { ApiKeyAnalyticRepository } from '@modules/api-key/repositories/api-key.analytic.repository';

@Module({
    controllers: [],
    providers: [ApiKeyRepository, ApiKeyAnalyticRepository],
    exports: [ApiKeyRepository, ApiKeyAnalyticRepository],
    imports: [],
})
export class ApiKeyRepositoryModule {}
