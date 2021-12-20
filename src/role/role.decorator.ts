import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseGuards
} from '@nestjs/common';
import { IAuthApplyDecorator } from 'src/auth/auth.interface';
import { RoleNotFoundGuard } from './guard/role.not-found.guard';
import { RolePutToRequestGuard } from './guard/role.put-to-request.guard';

export const GetRole = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const { __role } = ctx.switchToHttp().getRequest();
        return __role;
    }
);

export function RoleGetGuard(): IAuthApplyDecorator {
    return applyDecorators(UseGuards(RolePutToRequestGuard, RoleNotFoundGuard));
}
