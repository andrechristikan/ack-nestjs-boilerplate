import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_KEY_TYPE_META_KEY } from 'src/common/api-key/constants/api-key.constant';
import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class ApiKeyPayloadTypeGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required: ENUM_API_KEY_TYPE[] = this.reflector.getAllAndOverride<
            ENUM_API_KEY_TYPE[]
        >(API_KEY_TYPE_META_KEY, [context.getHandler(), context.getClass()]);

        if (!required) {
            return true;
        }

        const { apiKey } = context.switchToHttp().getRequest<IRequestApp>();

        if (!required.includes(apiKey.type)) {
            throw new BadRequestException({
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_TYPE_INVALID_ERROR,
                message: 'apiKey.error.typeInvalid',
            });
        }
        return true;
    }
}
