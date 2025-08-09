import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from '@modules/api-key/enums/api-key.status-code.enum';
import { HelperService } from '@common/helper/services/helper.service';
import { ApiKeyEntity } from '@modules/api-key/repository/entities/api-key.entity';

@Injectable()
export class ApiKeyNotExpiredPipe implements PipeTransform {
    // TODO: CHANGE THIS WITH USE CASES
    constructor(private readonly helperService: HelperService) {}

    async transform(value: ApiKeyEntity): Promise<ApiKeyEntity> {
        const today: Date = this.helperService.dateCreate();

        if (value.startDate && value.endDate && today > value.endDate) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.EXPIRED,
                message: 'apiKey.error.expired',
            });
        }

        return value;
    }
}
