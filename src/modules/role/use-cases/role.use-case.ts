import { Injectable } from '@nestjs/common';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
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
