import { Module } from '@nestjs/common';
import { ApiKeyRepositoryModule } from '@modules/api-key/repository/api-key.repository.module';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';

@Module({
    providers: [ApiKeyService],
    exports: [ApiKeyService, ApiKeyRepositoryModule],
    controllers: [],
    imports: [ApiKeyRepositoryModule],
})
export class ApiKeyModule {}
