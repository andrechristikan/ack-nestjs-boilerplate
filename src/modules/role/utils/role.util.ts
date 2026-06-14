import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { RoleAbilitiesResponseDto } from '@modules/role/dtos/response/role.abilities.response.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { Injectable } from '@nestjs/common';
import { Role } from '@generated/prisma-client';
import { ResponseUtil } from '@common/response/utils/response.util';

@Injectable()
export class RoleUtil {
    constructor(private readonly responseUtil: ResponseUtil) {}

    mapList(roles: Role[]): RoleListResponseDto[] {
        return this.responseUtil.serialize(RoleListResponseDto, roles);
    }

    mapOne(role: Role): RoleDto {
        return this.responseUtil.serialize(RoleDto, role);
    }

    mapAbilities(role: Role): RoleAbilitiesResponseDto {
        return this.responseUtil.serialize(RoleAbilitiesResponseDto, {
            abilities: role.abilities,
        });
    }

    mapActivityLogMetadata(role: Role): IActivityLogMetadata {
        return {
            roleId: role.id,
            roleName: role.name,
            roleType: role.type,
            timestamp: role.updatedAt ?? role.createdAt,
        };
    }
}
