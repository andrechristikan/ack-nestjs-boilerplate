import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class RoleUtil {
    mapList(roles: Role[]): RoleListResponseDto[] {
        return plainToInstance(RoleListResponseDto, roles);
    }

    mapOne(role: Role): RoleDto {
        return plainToInstance(RoleDto, role);
    }

    serializeName(name: string): string {
        return name.trim().toLowerCase();
    }

    serializeCreateDto(dto: RoleCreateRequestDto): Prisma.RoleCreateInput {
        const create: Prisma.RoleCreateInput = {
            ...dto,
            name: this.serializeName(dto.name),
            abilities: dto.abilities.map(ability => ({
                ...ability,
            })),
        };

        return create;
    }

    serializeUpdateDto(dto: RoleUpdateRequestDto): Prisma.RoleUpdateInput {
        const create: Prisma.RoleUpdateInput = {
            ...dto,
            abilities: dto.abilities.map(ability => ({
                ...ability,
            })),
        };

        return create;
    }
}
