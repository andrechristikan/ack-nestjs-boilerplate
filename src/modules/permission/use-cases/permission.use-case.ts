import { Injectable } from '@nestjs/common';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import { PermissionActiveDto } from 'src/modules/permission/dtos/permission.active.dto';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { PermissionUpdateGroupDto } from 'src/modules/permission/dtos/permission.update-group.dto';
import { PermissionUpdateDto } from 'src/modules/permission/dtos/permission.update.dto';
import { IPermissionGroup } from 'src/modules/permission/interfaces/permission.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';

@Injectable()
export class PermissionUseCase {
    async active(): Promise<PermissionActiveDto> {
        const dto: PermissionActiveDto = new PermissionActiveDto();
        dto.isActive = true;

        return dto;
    }

    async inactive(): Promise<PermissionActiveDto> {
        const dto: PermissionActiveDto = new PermissionActiveDto();
        dto.isActive = false;

        return dto;
    }

    async create({
        group,
        code,
        description,
    }: PermissionCreateDto): Promise<PermissionEntity> {
        const create: PermissionEntity = new PermissionEntity();
        create.group = group;
        create.code = code;
        create.description = description ?? undefined;
        create.isActive = true;

        return create;
    }

    async update(data: PermissionUpdateDto): Promise<PermissionUpdateDto> {
        return data;
    }

    async updateGroup(
        data: PermissionUpdateGroupDto
    ): Promise<PermissionUpdateGroupDto> {
        return data;
    }

    async groups(permissions: PermissionEntity[]): Promise<IPermissionGroup[]> {
        return Object.values(ENUM_PERMISSION_GROUP)
            .map((val) => {
                const pms: PermissionEntity[] = permissions.filter(
                    (l) => l.group === val
                );

                return {
                    group: val,
                    permissions: pms,
                };
            })
            .filter((val) => val.permissions.length !== 0);
    }
}
