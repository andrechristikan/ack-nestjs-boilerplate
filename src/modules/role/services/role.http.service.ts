import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import type { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import type { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import type { RoleDto } from '@modules/role/dtos/role.dto';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleHttpService {
    constructor(private readonly roleDomain: RoleDomain) {}

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>> {
        const { data, ...others } = await this.roleDomain.getListOffsetByAdmin(
            pagination,
            type
        );
        const roles: RoleListResponseDto[] = data.map(
            ({ _count, ...role }) => ({
                ...role,
                policies: _count.policies,
            })
        );

        return {
            data: roles,
            ...others,
        };
    }

    async getListCursorBySystem(
        pagination: IPaginationQueryCursorParams<Prisma.RoleWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>> {
        const { data, ...others } = await this.roleDomain.getListCursorBySystem(
            pagination,
            type
        );
        const roles: RoleListResponseDto[] = data.map(
            ({ _count, ...role }) => ({
                ...role,
                policies: _count.policies,
            })
        );

        return {
            data: roles,
            ...others,
        };
    }

    async getOne(id: string): Promise<IResponseReturn<RoleDto>> {
        const role = await this.roleDomain.getOne(id);

        return { data: role };
    }

    async createByAdmin(
        body: RoleCreateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        const created = await this.roleDomain.createByAdmin(body);

        return { data: created };
    }

    async updateByAdmin(
        id: string,
        body: RoleUpdateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        const updated = await this.roleDomain.updateByAdmin(id, body);

        return { data: updated };
    }

    async deleteByAdmin(id: string): Promise<IResponseReturn<void>> {
        await this.roleDomain.deleteByAdmin(id);

        return {};
    }
}
