import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';
import { ApiKeyDoc } from 'src/common/api-key/repository/entities/api-key.entity';

@Injectable()
export class ApiKeyActivePipe implements PipeTransform {
    async transform(value: ApiKeyDoc): Promise<ApiKeyDoc> {
        if (!value.isActive) {
            throw new BadRequestException({
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_IS_ACTIVE_ERROR,
                message: 'apiKey.error.isActiveInvalid',
            });
        }

        return value;
    }
}

@Injectable()
export class ApiKeyInactivePipe implements PipeTransform {
    async transform(value: ApiKeyDoc): Promise<ApiKeyDoc> {
        if (value.isActive) {
            throw new BadRequestException({
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_IS_ACTIVE_ERROR,
                message: 'apiKey.error.isActiveInvalid',
            });
        }

        return value;
    }
}
