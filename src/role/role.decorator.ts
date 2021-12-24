import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseGuards
} from '@nestjs/common';
import { RoleNotFoundGuard } from './guard/role.not-found.guard';
import { RolePutToRequestGuard } from './guard/role.put-to-request.guard';

export const GetRole = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const { __role } = ctx.switchToHttp().getRequest();
        return __role;
    }
);

export function RoleGetGuard(): any {
    return applyDecorators(UseGuards(RolePutToRequestGuard, RoleNotFoundGuard));
}
