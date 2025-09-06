import {
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleResponseDto } from '@modules/role/dtos/response/role.response.dto';

export interface IRoleService {
    getList(
        { where, ...params }: IPaginationQueryOffsetParams,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>>;
    getOne(id: string): Promise<RoleResponseDto>;
    create(data: RoleCreateRequestDto): Promise<RoleResponseDto>;
    update(id: string, data: RoleUpdateRequestDto): Promise<RoleResponseDto>;
    delete(id: string): Promise<void>;
}
