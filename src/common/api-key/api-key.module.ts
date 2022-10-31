import { Module } from '@nestjs/common';
import { API_KEY_REPOSITORY } from 'src/common/api-key/constants/api-key.constant';
import { ApiKeyKeyStrategy } from 'src/common/api-key/guards/api-key/api-key.strategy';
import { ApiKeyMongoRepository } from 'src/common/api-key/repositories/api-key.mongo.repository';
import { ApiKeyPostgresRepository } from 'src/common/api-key/repositories/api-key.postgres.repository';
import { ApiKeyMongoSchema } from 'src/common/api-key/schemas/api-key.mongo.schema';
import { ApiKeyPostgresSchema } from 'src/common/api-key/schemas/api-key.postgres.schema';
import {
    ApiKeyDatabaseName,
    ApiKeyEntity,
} from 'src/common/api-key/schemas/api-key.schema';
import { ApiKeyBulkKeyService } from 'src/common/api-key/services/api-key.bulk.service';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseConnectModule } from 'src/common/database/database.module';

@Module({
    providers: [ApiKeyService, ApiKeyBulkKeyService, ApiKeyKeyStrategy],
    exports: [ApiKeyService, ApiKeyBulkKeyService],
    controllers: [],
    imports: [
        DatabaseConnectModule.register({
            schema: {
                name: ApiKeyEntity.name,
                mongo: ApiKeyMongoSchema,
                postgres: ApiKeyPostgresSchema,
            },
            repository: {
                name: API_KEY_REPOSITORY,
                mongo: ApiKeyMongoRepository,
                postgres: ApiKeyPostgresRepository,
            },
            collection: ApiKeyDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
})
export class ApiKeyModule {}
