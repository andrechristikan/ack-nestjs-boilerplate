import {
    Injectable,
    CanActivate,
    ExecutionContext,
    NotFoundException,
} from '@nestjs/common';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';
import { ApiKeyDoc } from 'src/common/api-key/repository/entities/api-key.entity';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class ApiKeyNotFoundGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __apiKey } = context
            .switchToHttp()
            .getRequest<IRequestApp & { __apiKey: ApiKeyDoc }>();

        if (!__apiKey) {
            throw new NotFoundException({
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR,
                message: 'apiKey.error.notFound',
            });
        }
        return true;
    }
}
