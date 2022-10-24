import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Permission } from 'src/modules/permission/schemas/permission.schema';

export const GetPermission = createParamDecorator(
    (data: string, ctx: ExecutionContext): Permission => {
        const { __permission } = ctx.switchToHttp().getRequest();
        return __permission;
    }
);
