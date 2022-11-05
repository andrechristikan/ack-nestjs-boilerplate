import { Module } from '@nestjs/common';
import { ApiKeyKeyStrategy } from 'src/common/api-key/guards/api-key/api-key.strategy';
import { ApiKeyRepositoryModule } from 'src/common/api-key/repository/api-key.repository.module';
import { ApiKeyBulkKeyService } from 'src/common/api-key/services/api-key.bulk.service';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { DatabaseModule } from 'src/common/database/database.module';

@Module({
    providers: [ApiKeyService, ApiKeyBulkKeyService, ApiKeyKeyStrategy],
    exports: [ApiKeyService, ApiKeyBulkKeyService],
    controllers: [],
    imports: [ApiKeyRepositoryModule],
})
export class ApiKeyModule {}
