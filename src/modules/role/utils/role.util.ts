import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleResponseDto } from '@modules/role/dtos/response/role.response.dto';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '@modules/role/enums/role.status-code.enum';
import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
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

    // TODO: NEXT
    serializeCreateDto(dto: RoleCreateRequestDto): Prisma.RoleCreateInput {
        const create: Prisma.RoleCreateInput = {
            ...dto,
            name: dto.name.trim().toLowerCase(),
            abilities: JSON.stringify(dto.abilities ?? []),
        };

        return create;
    }
}
