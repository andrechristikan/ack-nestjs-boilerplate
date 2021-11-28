import {
    PipeTransform,
    ArgumentMetadata,
    UnprocessableEntityException
} from '@nestjs/common';
import { validate } from 'class-validator';
import { Debugger } from 'src/debugger/debugger.decorator';
import { Logger as DebuggerService } from 'winston';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { UserUpdateValidation } from 'src/user/validation/user.update.validation';
import { UserCreateValidation } from 'src/user/validation/user.create.validation';
import { classToClass } from 'class-transformer';
import { AuthLoginValidation } from 'src/auth/validation/auth.login.validation';
import { IErrors } from 'src/error/error.interface';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '../request.constant';
import { PermissionListValidation } from 'src/permission/validation/permission.list.validation';
import { RoleListValidation } from 'src/role/validation/role.list.validation';
import { UserListValidation } from 'src/user/validation/user.list.validation';

export class RequestValidationPipe implements PipeTransform {
    constructor(
        @Message() private readonly messageService: MessageService,
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
        const request = classToClass(classTransformer);
        this.debuggerService.info('Request Data', {
            class: 'RequestValidationPipe',
            function: 'transform',
            request: request
        });

        const rawErrors: Record<string, any>[] = await validate(request);
        if (rawErrors.length > 0) {
            const errors: IErrors[] = this.messageService.getRequestErrorsMessage(
                rawErrors
            );

            this.debuggerService.error('Request Errors', {
                class: 'RequestValidationPipe',
                function: 'transform',
                errors
            });

            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR,
                message: 'http.clientError.unprocessableEntity',
                errors
            });
        }
        return request;
    }

    private toValidate(metatype: Record<string, any>): boolean {
        const types: Record<string, any>[] = [
            UserUpdateValidation,
            UserCreateValidation,
            AuthLoginValidation,
            PermissionListValidation,
            RoleListValidation,
            UserListValidation
        ];
        return types.includes(metatype);
    }
}
