import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { IRoleDocument } from '../role.interface';
import { RoleService } from '../services/role.service';

@Injectable()
export class RolePutToRequestGuard implements CanActivate {
    constructor(private readonly roleService: RoleService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { params } = request;
        const { role } = params;

        const check: IRoleDocument =
            await this.roleService.findOneById<IRoleDocument>(role, {
                populate: {
                    permission: true,
                },
            });
        request.__role = check;

        return true;
    }
}
