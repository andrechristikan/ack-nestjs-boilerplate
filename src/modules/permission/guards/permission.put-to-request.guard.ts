import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PermissionDoc } from 'src/modules/permission/repository/entities/permission.entity';
import { PermissionService } from 'src/modules/permission/services/permission.service';

@Injectable()
export class PermissionPutToRequestGuard implements CanActivate {
    constructor(private readonly permissionService: PermissionService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { params } = request;
        const { permission } = params;

        const check: PermissionDoc = await this.permissionService.findOneById(
            permission
        );
        request.__permission = check;

        return true;
    }
}
