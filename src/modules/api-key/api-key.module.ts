import { Module } from '@nestjs/common';
import { ApiKeyRepositoryModule } from '@modules/api-key/repository/api-key.repository.module';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';

@Module({
    providers: [ApiKeyService, ApiKeyUtil],
    exports: [ApiKeyService, ApiKeyUtil, ApiKeyRepositoryModule],
    controllers: [],
    imports: [ApiKeyRepositoryModule],
})
export class ApiKeyModule {}
