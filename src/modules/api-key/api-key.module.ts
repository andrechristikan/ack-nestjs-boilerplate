import { Module } from '@nestjs/common';
import { ApiKeyRepositoryModule } from 'src/modules/api-key/repository/api-key.repository.module';
import { ApiKeyService } from 'src/modules/api-key/services/api-key.service';

@Module({
    providers: [ApiKeyService],
    exports: [ApiKeyService],
    controllers: [],
    imports: [ApiKeyRepositoryModule],
})
export class ApiKeyModule {}
