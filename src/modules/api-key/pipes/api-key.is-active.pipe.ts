import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from '@modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyEntity } from '@modules/api-key/repository/entities/api-key.entity';

@Injectable()
export class ApiKeyIsActivePipe implements PipeTransform {
    private readonly isActive: boolean[];

    // TODO: CHANGE THIS WITH USE CASES
    constructor(isActive: boolean[]) {
        this.isActive = isActive;
    }

    async transform(value: ApiKeyEntity): Promise<ApiKeyEntity> {
        if (!this.isActive.includes(value.isActive)) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.IS_ACTIVE,
                message: 'apiKey.error.isActiveInvalid',
            });
        }

        return value;
    }
}
