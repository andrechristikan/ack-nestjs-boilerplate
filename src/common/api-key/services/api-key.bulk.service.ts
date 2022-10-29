import { Injectable } from '@nestjs/common';
import { IApiKeyBulkService } from 'src/common/api-key/interfaces/api-key.bulk-service.interface';
import { ApiKeyRepository } from 'src/common/api-key/repositories/auth.api-key.repository';
import { IDatabaseManyOptions } from 'src/common/database/interfaces/database.interface';

@Injectable()
export class ApiKeyBulkKeyService implements IApiKeyBulkService {
    constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.apiKeyRepository.deleteMany(find, options);
    }
}
