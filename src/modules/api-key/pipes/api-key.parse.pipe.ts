import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from '@modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyEntity } from '@modules/api-key/repository/entities/api-key.entity';

@Injectable()
export class ApiKeyParsePipe implements PipeTransform {
    constructor(private readonly apiKeyService: ApiKeyService) {}

    async transform(value: string): Promise<ApiKeyEntity> {
        const apiKey: ApiKeyEntity =
            await this.apiKeyService.findOneByIdAndCache(value);
        if (!apiKey) {
            throw new NotFoundException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'apiKey.error.notFound',
            });
        }

        return apiKey;
    }
}
