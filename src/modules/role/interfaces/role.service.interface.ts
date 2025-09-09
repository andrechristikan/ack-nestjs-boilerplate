import {
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { ENUM_ROLE_TYPE } from '@prisma/client';

export interface IRoleService {
    getList(
        { where, ...params }: IPaginationQueryOffsetParams,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>>;
    getOne(id: string): Promise<RoleDto>;
    create(data: RoleCreateRequestDto): Promise<RoleDto>;
    update(id: string, data: RoleUpdateRequestDto): Promise<RoleDto>;
    delete(id: string): Promise<void>;
    validateRoleGuard(
        request: IRequestApp,
        roles: ENUM_ROLE_TYPE[]
    ): Promise<RoleAbilityDto[]>;
}
