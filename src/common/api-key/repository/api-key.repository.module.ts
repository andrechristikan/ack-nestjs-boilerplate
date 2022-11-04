import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    ApiKeyDatabaseName,
    ApiKeyEntity,
    ApiKeyRepositoryName,
} from 'src/common/api-key/repository/entity/api-key.entity';
import { ApiKeyMongoSchema } from 'src/common/api-key/repository/entity/api-key.mongo.entity';
import { ApiKeyMongoRepository } from 'src/common/api-key/repository/repositories/api-key.mongo.repository';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';

const provider = {
    useClass: ApiKeyMongoRepository,
    provide: ApiKeyRepositoryName,
};

@Module({
    providers: [provider],
    exports: [provider],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: ApiKeyEntity.name,
                    schema: ApiKeyMongoSchema,
                    collection: ApiKeyDatabaseName,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class ApiKeyRepositoryModule {}
