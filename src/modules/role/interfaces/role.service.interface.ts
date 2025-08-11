import {
    IDatabaseFilterOperation,
    IDatabaseFilterOperationComparison,
} from '@common/database/interfaces/database.interface';
import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleResponseDto } from '@modules/role/dtos/response/role.response.dto';
import { RoleEntity } from '@modules/role/repository/entities/role.entity';

export interface IRoleService {
    getList(
        { search, limit, skip, order }: IPaginationQueryReturn,
        isActive?: Record<string, IDatabaseFilterOperationComparison>,
        type?: Record<string, IDatabaseFilterOperation>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>>;
    getActiveList(
        { search, limit, skip, order }: IPaginationQueryReturn,
        type?: Record<string, IDatabaseFilterOperation>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>>;
    mapList(roles: RoleEntity[]): RoleListResponseDto[];
    mapOne(role: RoleEntity): RoleResponseDto;
    getOne(_id: string): Promise<RoleResponseDto>;
    create({
        name,
        permissions,
        type,
        description,
    }: RoleCreateRequestDto): Promise<RoleResponseDto>;
    update(
        _id: string,
        { permissions, type, description }: RoleUpdateRequestDto
    ): Promise<RoleResponseDto>;
    active(_id: string): Promise<RoleResponseDto>;
    inactive(_id: string): Promise<RoleResponseDto>;
}
