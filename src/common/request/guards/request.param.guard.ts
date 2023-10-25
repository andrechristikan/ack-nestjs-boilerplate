import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { REQUEST_PARAM_CLASS_DTOS_META_KEY } from 'src/common/request/constants/request.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class RequestParamRawGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { params } = context.switchToHttp().getRequest<IRequestApp>();
        const classDtos: ClassConstructor<any>[] = this.reflector.get<
            ClassConstructor<any>[]
        >(REQUEST_PARAM_CLASS_DTOS_META_KEY, context.getHandler());

        for (const clsDto of classDtos) {
            const request = plainToInstance(clsDto, params);

            const errors: ValidationError[] = await validate(request);

            if (errors.length > 0) {
                throw new BadRequestException({
                    statusCode:
                        ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR,
                    message: 'http.clientError.badRequest',
                    errors: errors,
                });
            }
        }

        return true;
    }
}
