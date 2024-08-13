import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/enums/role.status-code.enum';
import { RoleDoc } from 'src/modules/role/repository/entities/role.entity';
import { RoleService } from 'src/modules/role/services/role.service';

@Injectable()
export class RoleParsePipe implements PipeTransform {
    constructor(private readonly roleService: RoleService) {}

    async transform(value: any): Promise<RoleDoc> {
        const role: RoleDoc = await this.roleService.findOneById(value);
        if (!role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        return role;
    }
}
