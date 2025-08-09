import { Injectable, PipeTransform } from '@nestjs/common';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyEntity } from '@modules/api-key/repository/entities/api-key.entity';

@Injectable()
export class ApiKeyParsePipe implements PipeTransform {
    // TODO: CHANGE THIS WITH USE CASES
    constructor(private readonly apiKeyService: ApiKeyService) {}

    async transform(value: string): Promise<ApiKeyEntity> {
        const apiKey: ApiKeyEntity =
            await this.apiKeyService.findOneByIdAndCache(value);

        return apiKey;
    }
}
