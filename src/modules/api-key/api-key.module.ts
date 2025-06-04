import { Module } from '@nestjs/common';
import { ApiKeyRepositoryModule } from '@module/api-key/repository/api-key.repository.module';
import { ApiKeyService } from '@module/api-key/services/api-key.service';

@Module({
    providers: [ApiKeyService],
    exports: [ApiKeyService],
    controllers: [],
    imports: [ApiKeyRepositoryModule],
})
export class ApiKeyModule {}
