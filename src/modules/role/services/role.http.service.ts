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
import { IRoleHttpService } from '@modules/role/interfaces/role.http.service.interface';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleHttpService implements IRoleHttpService {
    constructor(
        private readonly roleService: RoleService,
        private readonly roleUtil: RoleUtil
    ) {}

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>> {
        const { data, ...others } =
            await this.roleService.getListOffsetByAdmin(pagination, type);
        const roles: RoleListResponseDto[] = this.roleUtil.mapList(data);

        return {
            data: roles,
            ...others,
        };
    }

    async getOne(id: string): Promise<IResponseReturn<RoleDto>> {
        const role = await this.roleService.getOne(id);

        return { data: this.roleUtil.mapOne(role) };
    }

    async getAbilities(
        id: string
    ): Promise<IResponseReturn<RoleAbilitiesResponseDto>> {
        const role = await this.roleService.getOne(id);

        return { data: this.roleUtil.mapAbilities(role) };
    }

    async createByAdmin(
        body: RoleCreateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        const created = await this.roleService.createByAdmin(body);

        return {
            data: this.roleUtil.mapOne(created),
        };
    }

    async updateByAdmin(
        id: string,
        body: RoleUpdateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        const updated = await this.roleService.updateByAdmin(id, body);

        return {
            data: this.roleUtil.mapOne(updated),
        };
    }

    async deleteByAdmin(id: string): Promise<IResponseReturn<void>> {
        await this.roleService.deleteByAdmin(id);

        return {};
    }
}
