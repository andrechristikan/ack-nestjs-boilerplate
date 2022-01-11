import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PermissionDocument } from '../permission.interface';
import { PermissionService } from '../permission.service';

@Injectable()
export class PermissionPutToRequestGuard implements CanActivate {
    constructor(private readonly permissionService: PermissionService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { params } = request;
        const { permission } = params;

        const check: PermissionDocument =
            await this.permissionService.findOneById(permission);
        request.__permission = check;

        return true;
    }
}
