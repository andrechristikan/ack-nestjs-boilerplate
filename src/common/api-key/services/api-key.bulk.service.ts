import { Injectable } from '@nestjs/common';
import { API_KEY_REPOSITORY } from 'src/common/api-key/constants/api-key.constant';
import { IApiKeyBulkService } from 'src/common/api-key/interfaces/api-key.bulk-service.interface';
import { ApiKeyEntity } from 'src/common/api-key/schemas/api-key.schema';
import { DatabaseRepository } from 'src/common/database/decorators/database.decorator';
import { IDatabaseManyOptions } from 'src/common/database/interfaces/database.interface';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';

@Injectable()
export class ApiKeyBulkKeyService implements IApiKeyBulkService {
    constructor(
        @DatabaseRepository(API_KEY_REPOSITORY)
        private readonly apiKeyRepository: IDatabaseRepository<ApiKeyEntity>
    ) {}

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.apiKeyRepository.deleteMany(find, options);
    }
}
