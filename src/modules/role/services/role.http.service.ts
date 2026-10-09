import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    RoleCursorAvailableOrderBy,
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
    RoleDefaultScope,
} from '@modules/role/constants/role.list.constant';
import type { RoleAdminListRequestDto } from '@modules/role/dtos/request/role.admin-list.request.dto';
import type { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import type { RoleSharedListRequestDto } from '@modules/role/dtos/request/role.shared-list.request.dto';
import type { RoleSystemListRequestDto } from '@modules/role/dtos/request/role.system-list.request.dto';
import type { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import type { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import type { RoleDto } from '@modules/role/dtos/role.dto';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleHttpService {
    constructor(
        private readonly roleDomain: RoleDomain,
        private readonly policyAbilityDomain: PolicyAbilityDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListOffsetByAdmin(
        query: RoleAdminListRequestDto
    ): Promise<IResponsePaginationReturn<RoleListResponseDto>> {
        const accessibleWhere = this.policyAbilityDomain.accessibleWhere(
            EnumPolicyAction.read,
            EnumPolicySubject.Role
        );
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.RoleWhereInput>(query, {
                availableSearch: RoleDefaultAvailableSearch,
                availableOrderBy: RoleDefaultAvailableOrderBy,
            });
        const scope = this.paginationQueryUtil.inEnum(
            Prisma.RoleScalarFieldEnum.scope,
            query.scope,
            RoleDefaultScope
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(scope?.storeFilter ?? {}),
            },
        });

        const { data, ...others } = await this.roleDomain.getListOffsetByAdmin(
            params,
            scope?.where,
            accessibleWhere
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
        query: RoleSystemListRequestDto
    ): Promise<IResponsePaginationReturn<RoleListResponseDto>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.RoleWhereInput>(query, {
                availableSearch: RoleDefaultAvailableSearch,
                availableOrderBy: RoleCursorAvailableOrderBy,
            });
        const scope = this.paginationQueryUtil.inEnum(
            Prisma.RoleScalarFieldEnum.scope,
            query.scope,
            RoleDefaultScope
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(scope?.storeFilter ?? {}),
            },
        });

        const { data, ...others } = await this.roleDomain.getListCursorBySystem(
            params,
            scope?.where
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

    async getListOffsetByShared(
        query: RoleSharedListRequestDto
    ): Promise<IResponsePaginationReturn<RoleListResponseDto>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.RoleWhereInput>(query, {
                availableSearch: RoleDefaultAvailableSearch,
                availableOrderBy: RoleDefaultAvailableOrderBy,
            });
        const scope = this.paginationQueryUtil.equalString(
            Prisma.RoleScalarFieldEnum.scope,
            query.scope
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(scope?.storeFilter ?? {}),
            },
        });

        const { data, ...others } = await this.roleDomain.getListOffsetByShared(
            params,
            scope?.where
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
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.read,
            subject(EnumPolicySubject.Role, role)
        );

        return { data: role };
    }

    async updateByAdmin(
        id: string,
        body: RoleUpdateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        const role = await this.roleDomain.getOne(id);
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.update,
            subject(EnumPolicySubject.Role, role)
        );
        const updated = await this.roleDomain.updateByAdmin(id, body);

        return { data: updated };
    }

    async createByAdmin(
        body: RoleCreateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        const created = await this.roleDomain.createByAdmin(body);

        return { data: created };
    }

    async deleteByAdmin(id: string): Promise<IResponseReturn<void>> {
        const role = await this.roleDomain.getOne(id);
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.delete,
            subject(EnumPolicySubject.Role, role)
        );
        await this.roleDomain.deleteByAdmin(id);

        return {};
    }
}
