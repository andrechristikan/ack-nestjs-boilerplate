import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PermissionDoc } from 'src/modules/permission/repository/entities/permission.entity';

export const GetPermission = createParamDecorator(
    (data: string, ctx: ExecutionContext): PermissionDoc => {
        const { __permission } = ctx.switchToHttp().getRequest();
        return __permission;
    }
);
