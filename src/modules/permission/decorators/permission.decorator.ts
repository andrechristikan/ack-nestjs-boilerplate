import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
    PermissionDoc,
    PermissionEntity,
} from 'src/modules/permission/repository/entities/permission.entity';

export const GetPermission = createParamDecorator(
    (
        returnPlain: boolean,
        ctx: ExecutionContext
    ): PermissionDoc | PermissionEntity => {
        const { __permission } = ctx.switchToHttp().getRequest();
        return returnPlain ? __permission.toObject() : __permission;
    }
);
