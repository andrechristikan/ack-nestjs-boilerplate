import {
    ExecutionContext,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { UserGuard } from 'src/modules/user/guards/user.guard';

export function UserProtected(): MethodDecorator {
    return applyDecorators(UseGuards(UserGuard));
}

export const User = createParamDecorator(
    <T>(_: unknown, ctx: ExecutionContext): T => {
        const { __user } = ctx
            .switchToHttp()
            .getRequest<IRequestApp & { __user: T }>();
        return __user;
    }
);
