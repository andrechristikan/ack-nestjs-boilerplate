import { Module } from '@nestjs/common';
import { ApiKeyKeyStrategy } from 'src/common/api-key/guards/api-key/api-key.strategy';
import { ApiKeyRepository } from 'src/common/api-key/repository/entities/api-key.entity';
import {
    ApiKeyMongoEntity,
    ApiKeyMongoSchema,
} from 'src/common/api-key/repository/entities/api-key.mongo.entity';
import { ApiKeyPostgresEntity } from 'src/common/api-key/repository/entities/api-key.postgres.entity';
import { ApiKeyMongoRepository } from 'src/common/api-key/repository/repositories/api-key.mongo.repository';
import { ApiKeyPostgresRepository } from 'src/common/api-key/repository/repositories/api-key.postgres.repository';
import { ApiKeyBulkKeyService } from 'src/common/api-key/services/api-key.bulk.service';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseRepositoryModule } from 'src/common/database/database.repository.module';

@Module({
    providers: [ApiKeyService, ApiKeyBulkKeyService, ApiKeyKeyStrategy],
    exports: [ApiKeyService, ApiKeyBulkKeyService],
    controllers: [],
    imports: [
        DatabaseRepositoryModule.forFutureAsync({
            name: ApiKeyRepository,
            mongo: {
                schema: ApiKeyMongoSchema,
                entity: ApiKeyMongoEntity,
                repository: ApiKeyMongoRepository,
            },
            postgres: {
                entity: ApiKeyPostgresEntity,
                repository: ApiKeyPostgresRepository,
            },
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
})
export class ApiKeyModule {}
