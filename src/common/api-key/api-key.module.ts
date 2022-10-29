import { Module } from '@nestjs/common';
import { ApiKeyKeyStrategy } from 'src/common/api-key/guards/api-key/api-key.strategy';
import { ApiKeyRepository } from 'src/common/api-key/repositories/auth.api-key.repository';
import {
    ApiKeyDatabaseName,
    ApiKeyEntity,
    ApiKeySchema,
} from 'src/common/api-key/schemas/api-key.schema';
import { ApiKeyBulkKeyService } from 'src/common/api-key/services/api-key.bulk.service';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseConnectModule } from 'src/common/database/database.module';

@Module({
    providers: [
        ApiKeyService,
        ApiKeyBulkKeyService,
        ApiKeyKeyStrategy,
        ApiKeyRepository,
    ],
    exports: [ApiKeyService, ApiKeyBulkKeyService],
    controllers: [],
    imports: [
        DatabaseConnectModule.register({
            name: ApiKeyEntity.name,
            schema: ApiKeySchema,
            collection: ApiKeyDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
})
export class ApiKeyModule {}
