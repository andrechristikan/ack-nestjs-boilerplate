import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyDoc } from 'src/modules/api-key/repository/entities/api-key.entity';

@Injectable()
export class ApiKeyNotExpiredPipe implements PipeTransform {
    constructor(private readonly helperDateService: HelperDateService) {}

    async transform(value: ApiKeyDoc): Promise<ApiKeyDoc> {
        const today: Date = this.helperDateService.create();

        if (value.startDate && value.endDate && today > value.endDate) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.EXPIRED,
                message: 'apiKey.error.expired',
            });
        }

        return value;
    }
}
