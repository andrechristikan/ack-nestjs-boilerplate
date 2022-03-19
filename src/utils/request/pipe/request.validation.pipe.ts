import {
    PipeTransform,
    ArgumentMetadata,
    UnprocessableEntityException,
    Injectable,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import AuthChangePasswordValidation from 'src/auth/validation/auth.change-password.validation';
import AuthLoginValidation from 'src/auth/validation/auth.login.validation';
import AuthSignUpValidation from 'src/auth/validation/auth.sign-up.validation';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import PermissionListValidation from 'src/permission/validation/permission.list.validation';
import PermissionUpdateValidation from 'src/permission/validation/permission.update.validation';
import RoleCreateValidation from 'src/role/validation/role.create.validation';
import RoleListValidation from 'src/role/validation/role.list.validation';
import RoleUpdateValidation from 'src/role/validation/role.update.validation';
import UserCreateValidation from 'src/user/validation/user.create.validation';
import UserListValidation from 'src/user/validation/user.list.validation';
import UserUpdateValidation from 'src/user/validation/user.update.validation';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '../request.constant';

@Injectable()
export class RequestValidationPipe implements PipeTransform {
    constructor(private readonly debuggerService: DebuggerService) {}

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
        this.debuggerService.info(
            'Request Data',
            'RequestValidationPipe',
            'transform',
            request
        );

        const rawErrors: Record<string, any>[] = await validate(request);
        if (rawErrors.length > 0) {
            this.debuggerService.error(
                'Request Errors',
                'RequestValidationPipe',
                'transform',
                rawErrors
            );

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
