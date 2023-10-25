import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';
import { ApiKeyDoc } from 'src/common/api-key/repository/entities/api-key.entity';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class ApiKeyExpiredGuard implements CanActivate {
    constructor(private readonly helperDateService: HelperDateService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __apiKey } = context
            .switchToHttp()
            .getRequest<IRequestApp & { __apiKey: ApiKeyDoc }>();
        const today: Date = this.helperDateService.create();

        if (
            __apiKey.startDate &&
            __apiKey.endDate &&
            today > __apiKey.endDate
        ) {
            throw new BadRequestException({
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_EXPIRED_ERROR,
                message: 'apiKey.error.expired',
            });
        }
        return true;
    }
}
