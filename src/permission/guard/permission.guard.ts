import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { Response } from 'src/response/response.decorator';
import { ResponseService } from 'src/response/response.service';
import { PermissionList, PERMISSION_KEY } from '../permission.constant';

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Message() private readonly messageService: MessageService,
        private reflector: Reflector
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission: PermissionList[] = this.reflector.getAllAndOverride<
            PermissionList[]
        >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

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
                this.responseService.error(
                    this.messageService.get('http.clientError.forbidden')
                )
            );
        }
        return permission;
    }
}
