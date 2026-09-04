import {
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleAbilitiesResponseDto } from '@modules/role/dtos/response/role.abilities.response.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';

export interface IRoleHttpService {
    getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>>;
    getOne(id: string): Promise<IResponseReturn<RoleDto>>;
    getAbilities(
        id: string
    ): Promise<IResponseReturn<RoleAbilitiesResponseDto>>;
    createByAdmin(
        body: RoleCreateRequestDto
    ): Promise<IResponseReturn<RoleDto>>;
    updateByAdmin(
        id: string,
        body: RoleUpdateRequestDto
    ): Promise<IResponseReturn<RoleDto>>;
    deleteByAdmin(id: string): Promise<IResponseReturn<void>>;
}
