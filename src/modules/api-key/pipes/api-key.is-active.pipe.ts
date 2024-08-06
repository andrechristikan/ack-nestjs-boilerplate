import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyDoc } from 'src/modules/api-key/repository/entities/api-key.entity';

@Injectable()
export class ApiKeyIsActivePipe implements PipeTransform {
    private readonly isActive: boolean[];

    constructor(isActive: boolean[]) {
        this.isActive = isActive;
    }

    async transform(value: ApiKeyDoc): Promise<ApiKeyDoc> {
        if (!this.isActive.includes(value.isActive)) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.IS_ACTIVE,
                message: 'apiKey.error.isActiveInvalid',
            });
        }

        return value;
    }
}
