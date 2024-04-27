import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';
import { ApiKeyDoc } from 'src/common/api-key/repository/entities/api-key.entity';

@Injectable()
export class ApiKeyTypePipe implements PipeTransform {
    constructor(readonly types: ENUM_API_KEY_TYPE[]) {}

    async transform(value: ApiKeyDoc): Promise<ApiKeyDoc> {
        const types =
            !this.types || this.types === null
                ? Object.values(ENUM_API_KEY_TYPE)
                : this.types;

        if (!types.includes(value.type)) {
            throw new BadRequestException({
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_TYPE_INVALID_ERROR,
                message: 'apiKey.error.typeInvalid',
            });
        }

        return value;
    }
}
