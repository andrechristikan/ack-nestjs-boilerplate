import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    ApiKeyEntity,
    ApiKeySchema,
} from 'src/common/api-key/repository/entities/api-key.entity';
import { ApiKeyRepository } from 'src/common/api-key/repository/repositories/api-key.repository';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';

@Module({
    providers: [ApiKeyRepository],
    exports: [ApiKeyRepository],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: ApiKeyEntity.name,
                    schema: ApiKeySchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class ApiKeyRepositoryModule {}
