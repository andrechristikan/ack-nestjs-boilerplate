import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { API_KEY_X_TYPE_META_KEY } from 'src/modules/api-key/constants/api-key.constant';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/modules/api-key/enums/api-key.status-code.enum';

@Injectable()
export class ApiKeyXApiKeyTypeGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required: ENUM_API_KEY_TYPE[] = this.reflector.getAllAndOverride<
            ENUM_API_KEY_TYPE[]
        >(API_KEY_X_TYPE_META_KEY, [context.getHandler(), context.getClass()]);

        if (!required) {
            return true;
        }

        const { apiKey } = context.switchToHttp().getRequest<IRequestApp>();

        if (!required.includes(apiKey.type)) {
            throw new BadRequestException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_FORBIDDEN,
                message: 'apiKey.error.xApiKey.forbidden',
            });
        }
        return true;
    }
}
