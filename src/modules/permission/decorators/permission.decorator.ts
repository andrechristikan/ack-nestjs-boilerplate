import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';

export const GetPermission = createParamDecorator(
    (data: string, ctx: ExecutionContext): PermissionEntity => {
        const { __permission } = ctx.switchToHttp().getRequest();
        return __permission;
    }
);
