import { DynamicModule, Global, Module } from '@nestjs/common';
import { ApiKeyRepositoryModule } from 'src/modules/api-key/repository/api-key.repository.module';
import { ApiKeyService } from 'src/modules/api-key/services/api-key.service';

@Global()
@Module({})
export class ApiKeyModule {
    static forRoot(): DynamicModule {
        return {
            module: ApiKeyModule,
            providers: [ApiKeyService],
            exports: [ApiKeyService],
            controllers: [],
            imports: [ApiKeyRepositoryModule],
        };
    }
}
