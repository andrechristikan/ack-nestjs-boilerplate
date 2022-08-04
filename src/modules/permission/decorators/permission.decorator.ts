import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PermissionDocument } from '../schemas/permission.schema';

export const GetPermission = createParamDecorator(
    (data: string, ctx: ExecutionContext): PermissionDocument => {
        const { __permission } = ctx.switchToHttp().getRequest();
        return __permission;
    }
);
