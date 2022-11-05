import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKeyDatabaseName } from 'src/common/api-key/repository/entity/api-key.entity';
import {
    ApiKeyMongoEntity,
    ApiKeyMongoSchema,
} from 'src/common/api-key/repository/entity/api-key.mongo.entity';
import { ApiKeyRepositoryProvider } from 'src/common/api-key/repository/providers/api-key.repository.provider';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';

@Module({
    providers: [ApiKeyRepositoryProvider],
    exports: [ApiKeyRepositoryProvider],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: ApiKeyMongoEntity.name,
                    schema: ApiKeyMongoSchema,
                    collection: ApiKeyDatabaseName,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class ApiKeyRepositoryModule {}
