import { Injectable } from '@nestjs/common';
import { IApiKeyBulkService } from 'src/common/api-key/interfaces/api-key.bulk-service.interface';
import {
    ApiKeyEntity,
    ApiKeyRepository,
} from 'src/common/api-key/repository/entities/api-key.entity';
import { DatabaseRepository } from 'src/common/database/decorators/database.decorator';
import { IDatabaseManyOptions } from 'src/common/database/interfaces/database.interface';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';

@Injectable()
export class ApiKeyBulkKeyService implements IApiKeyBulkService {
    constructor(
        @DatabaseRepository(ApiKeyRepository)
        private readonly apiKeyRepository: IDatabaseRepository<ApiKeyEntity>
    ) {}

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.apiKeyRepository.deleteMany(find, options);
    }
}
