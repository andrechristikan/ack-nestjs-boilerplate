import {
    Injectable,
    CanActivate,
    ExecutionContext,
    Type,
    mixin,
    BadRequestException,
} from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '../request.constant';

export function ParamGuard(
    classValidation: ClassConstructor<any>[]
): Type<CanActivate> {
    @Injectable()
    class MixinParamGuard implements CanActivate {
        async canActivate(context: ExecutionContext): Promise<boolean> {
            const { params } = context.switchToHttp().getRequest();
            for (const cv of classValidation) {
                const request = plainToInstance(cv, params);

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

    return mixin(MixinParamGuard);
}
