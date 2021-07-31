import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { Role } from 'src/role/role.decorator';
import { RoleDocumentFull } from 'src/role/role.interface';
import { RoleService } from 'src/role/role.service';
import { PermissionList, PERMISSION_META_KEY } from '../permission.constant';

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        @Message() private readonly messageService: MessageService,
        @Role() private readonly roleService: RoleService,
        private reflector: Reflector
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission: PermissionList[] = this.reflector.getAllAndOverride<
            PermissionList[]
        >(PERMISSION_META_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredPermission) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        const { permissions } = user;

        const permission: boolean = requiredPermission.every((role) =>
            permissions.includes(role)
        );

        if (!permission) {
            throw new ForbiddenException(
                this.messageService.get('http.clientError.forbidden')
            );
        }
        return permission;
    }
}
