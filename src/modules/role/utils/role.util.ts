import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class RoleUtil {
    mapList(roles: Role[]): RoleListResponseDto[] {
        return plainToInstance(RoleListResponseDto, roles);
    }

    mapOne(role: Role): RoleDto {
        return plainToInstance(RoleDto, role);
    }
}
