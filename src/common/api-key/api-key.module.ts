import { Module } from '@nestjs/common';
import { ApiKeyXApiKeyStrategy } from 'src/common/api-key/guards/x-api-key/api-key.x-api-key.strategy';
import { ApiKeyRepositoryModule } from 'src/common/api-key/repository/api-key.repository.module';
import { ApiKeyBulkKeyService } from 'src/common/api-key/services/api-key.bulk.service';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';

@Module({
    providers: [ApiKeyService, ApiKeyBulkKeyService, ApiKeyXApiKeyStrategy],
    exports: [ApiKeyService, ApiKeyBulkKeyService],
    controllers: [],
    imports: [ApiKeyRepositoryModule],
})
export class ApiKeyModule {}
