import { Module } from '@nestjs/common';
import { ApiKeyXApiKeyStrategy } from 'src/common/api-key/guards/x-api-key/api-key.x-api-key.strategy';
import { ApiKeyRepositoryModule } from 'src/common/api-key/repository/api-key.repository.module';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { DebuggerModule } from '../debugger/debugger.module';

@Module({
    providers: [ApiKeyService, ApiKeyXApiKeyStrategy],
    exports: [ApiKeyService],
    controllers: [],
    imports: [ApiKeyRepositoryModule, DebuggerModule],
})
export class ApiKeyModule {}
