import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    ApiKeyEntity,
    ApiKeySchema,
} from 'src/modules/api-key/repository/entities/api-key.entity';
import { ApiKeyRepository } from 'src/modules/api-key/repository/repositories/api-key.repository';

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
