import { Injectable } from '@nestjs/common';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';
import { SettingCreateDto } from 'src/common/setting/dtos/setting.create.dto';
import { SettingUpdateDto } from 'src/common/setting/dtos/setting.update.dto';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import { PermissionActiveDto } from 'src/modules/permission/dtos/permission.active.dto';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { PermissionGroupDto } from 'src/modules/permission/dtos/permission.group.dto';
import { PermissionUpdateGroupDto } from 'src/modules/permission/dtos/permission.update-group.dto';
import { PermissionUpdateDto } from 'src/modules/permission/dtos/permission.update.dto';
import { IPermissionGroup } from 'src/modules/permission/interfaces/permission.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { RoleActiveDto } from 'src/modules/role/dtos/role.active.dto';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { RoleUpdateDto } from 'src/modules/role/dtos/role.update.dto';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';

@Injectable()
export class RoleUseCase {
    async active(): Promise<RoleActiveDto> {
        const dto: RoleActiveDto = new RoleActiveDto();
        dto.isActive = true;

        return dto;
    }

    async inactive(): Promise<RoleActiveDto> {
        const dto: RoleActiveDto = new RoleActiveDto();
        dto.isActive = false;

        return dto;
    }

    async create({
        accessFor,
        permissions,
        name,
    }: RoleCreateDto): Promise<RoleEntity> {
        const create: RoleEntity = new RoleEntity();
        create.accessFor = accessFor;
        create.permissions = permissions.map((val) => `${val}`);
        create.isActive = true;
        create.name = name;

        return create;
    }

    async createSuperAdmin(): Promise<RoleEntity> {
        const create: RoleEntity = new RoleEntity();
        create.name = 'superadmin';
        create.permissions = [];
        create.isActive = true;
        create.accessFor = ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN;

        return create;
    }

    async update(data: RoleUpdateDto): Promise<RoleUpdateDto> {
        return data;
    }
}
