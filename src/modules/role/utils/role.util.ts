import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleResponseDto } from '@modules/role/dtos/response/role.response.dto';
import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class RoleUtil {
    mapList(roles: Role[]): RoleListResponseDto[] {
        return plainToInstance(RoleListResponseDto, roles);
    }

    mapOne(role: Role): RoleResponseDto {
        return plainToInstance(RoleResponseDto, role);
    }

    serializeName(name: string): string {
        return name.trim().toLowerCase();
    }

    serializeCreateDto(dto: RoleCreateRequestDto): Prisma.RoleCreateInput {
        const create: Prisma.RoleCreateInput = {
            ...dto,
            name: dto.name.trim().toLowerCase(),
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
