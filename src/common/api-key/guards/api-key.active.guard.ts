import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_KEY_ACTIVE_META_KEY } from 'src/common/api-key/constants/api-key.constant';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';

@Injectable()
export class ApiKeyActiveGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required: boolean[] = this.reflector.getAllAndOverride<boolean[]>(
            API_KEY_ACTIVE_META_KEY,
            [context.getHandler(), context.getClass()]
        );

        if (!required) {
            return true;
        }

        const { __apiKey } = context.switchToHttp().getRequest();

        if (!required.includes(__apiKey.isActive)) {
            throw new BadRequestException({
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_IS_ACTIVE_ERROR,
                message: 'apiKey.error.isActiveInvalid',
            });
        }
        return true;
    }
}
