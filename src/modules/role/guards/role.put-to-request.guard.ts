import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { RoleDoc } from 'src/modules/role/repository/entities/role.entity';
import { RoleService } from 'src/modules/role/services/role.service';

@Injectable()
export class RolePutToRequestGuard implements CanActivate {
    constructor(private readonly roleService: RoleService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { params } = request;
        const { role } = params;

        const check: RoleDoc = await this.roleService.findOneById(role, {
            join: true,
        });
        request.__role = check;

        return true;
    }
}
