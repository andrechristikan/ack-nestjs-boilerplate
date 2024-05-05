import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';
import { ApiKeyDoc } from 'src/common/api-key/repository/entities/api-key.entity';

@Injectable()
export class ApiKeyExpiredPipe implements PipeTransform {
    constructor(private readonly helperDateService: HelperDateService) {}

    async transform(value: ApiKeyDoc): Promise<ApiKeyDoc> {
        const today: Date = this.helperDateService.create();

        if (value.startDate && value.endDate && today > value.endDate) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.EXPIRED_ERROR,
                message: 'apiKey.error.expired',
            });
        }

        return value;
    }
}
