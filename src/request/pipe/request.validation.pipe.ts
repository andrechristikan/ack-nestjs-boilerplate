import {
    PipeTransform,
    ArgumentMetadata,
    UnprocessableEntityException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { Debugger } from 'src/debugger/debugger.decorator';
import { Logger as DebuggerService } from 'winston';
import { UserUpdateValidation } from 'src/user/validation/user.update.validation';
import { UserCreateValidation } from 'src/user/validation/user.create.validation';
import { plainToInstance } from 'class-transformer';
import { AuthLoginValidation } from 'src/auth/validation/auth.login.validation';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '../request.constant';
import { PermissionListValidation } from 'src/permission/validation/permission.list.validation';
import { RoleListValidation } from 'src/role/validation/role.list.validation';
import { UserListValidation } from 'src/user/validation/user.list.validation';
import { AuthSignUpValidation } from 'src/auth/validation/auth.sign-up.validation';
import { RoleCreateValidation } from 'src/role/validation/role.create.validation';
import { PermissionUpdateValidation } from 'src/permission/validation/permission.update.validation';
import { RoleUpdateValidation } from 'src/role/validation/role.update.validation';
import { AuthChangePasswordValidation } from 'src/auth/validation/auth.change-password.validation';

export class RequestValidationPipe implements PipeTransform {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService
    ) {}

    async transform(
        value: Record<string, any>,
        { metatype }: ArgumentMetadata
    ): Promise<Record<string, any>> {
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }

        const classTransformer = new metatype(value);
        const request = plainToInstance(metatype, {
            ...classTransformer,
            ...value,
        });
        this.debuggerService.info('Request Data', {
            class: 'RequestValidationPipe',
            function: 'transform',
            request: request,
        });

        const rawErrors: Record<string, any>[] = await validate(request);
        if (rawErrors.length > 0) {
            this.debuggerService.error('Request Errors', {
                class: 'RequestValidationPipe',
                function: 'transform',
                errors: rawErrors,
            });

            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR,
                message: 'http.clientError.unprocessableEntity',
                errors: rawErrors,
            });
        }
        return request;
    }

    private toValidate(metatype: Record<string, any>): boolean {
        const types: Record<string, any>[] = [
            UserListValidation,
            UserUpdateValidation,
            UserCreateValidation,
            AuthSignUpValidation,
            AuthLoginValidation,
            PermissionListValidation,
            RoleListValidation,
            RoleCreateValidation,
            PermissionUpdateValidation,
            RoleUpdateValidation,
            AuthChangePasswordValidation,
        ];
        return types.includes(metatype);
    }
}
