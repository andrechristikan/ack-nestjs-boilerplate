import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUEST_PARAM_REQUIRED_META_KEY } from 'src/common/request/constants/request.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class RequestParamRequiredGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { params } = context.switchToHttp().getRequest<IRequestApp>();
        const fields: string[] =
            this.reflector.get<string[]>(
                REQUEST_PARAM_REQUIRED_META_KEY,
                context.getHandler()
            ) || [];

        for (const field of fields) {
            if (!params[field]) {
                throw new BadRequestException({
                    statusCode:
                        ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR,
                    message: 'request.required',
                    _metadata: {
                        messageProperties: {
                            property: field,
                        },
                    },
                });
            }
        }

        return true;
    }
}
