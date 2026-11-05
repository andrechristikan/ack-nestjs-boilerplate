import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
    RoleDefaultType,
    RoleSystemListCursorScope,
} from '@modules/role/constants/role.list.constant';
import type { RoleAdminListRequestDto } from '@modules/role/dtos/request/role.admin-list.request.dto';
import type { RoleSystemListRequestDto } from '@modules/role/dtos/request/role.system-list.request.dto';
import type { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import type { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import type { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import type { RoleDto } from '@modules/role/dtos/role.dto';
import { RoleDomain } from '@modules/role/domains/role.domain';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleHttpService {
    constructor(
        private readonly roleDomain: RoleDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly roleUtil: RoleUtil,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private prepareActivityLog(
        action: EnumActivityLogAction,
        role: IRole
    ): IActivityLogStaged {
        const timestamp = this.helperDateService.create();
        const metadata = this.roleUtil.mapActivityLogMetadata(role, timestamp);

        return this.activityLogDomain.prepare({
            action,
            metadata,
        });
    }

    async getListOffsetByAdmin(
        query: RoleAdminListRequestDto
    ): Promise<IResponsePaginationReturn<RoleListResponseDto>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.RoleWhereInput>(query, {
                availableSearch: RoleDefaultAvailableSearch,
                availableOrderBy: RoleDefaultAvailableOrderBy,
            });
        const type = this.paginationFilterUtil.inEnum(
            Prisma.RoleScalarFieldEnum.type,
            query.type,
            RoleDefaultType
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(type?.storeFilter ?? {}),
            },
        });

        const { data, ...others } = await this.roleDomain.getListOffsetByAdmin(
            params,
            type?.where
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
                scope: RoleSystemListCursorScope,
                availableSearch: RoleDefaultAvailableSearch,
                availableOrderBy: RoleDefaultAvailableOrderBy,
            });
        const type = this.paginationFilterUtil.inEnum(
            Prisma.RoleScalarFieldEnum.type,
            query.type,
            RoleDefaultType
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(type?.storeFilter ?? {}),
            },
        });

        const { data, ...others } = await this.roleDomain.getListCursorBySystem(
            params,
            type?.where
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
        body: RoleCreateRequestDto,
        user: IUser
    ): Promise<IResponseReturn<RoleDto>> {
        const roleId = this.databaseUtil.createId();
        const activityLogs = [
            this.prepareActivityLog(EnumActivityLogAction.adminRoleCreate, {
                id: roleId,
                name: body.name,
                type: body.type,
            }),
        ];

        const created = await this.roleDomain.createByAdmin(
            roleId,
            {
                name: body.name,
                description: body.description ?? null,
                type: body.type,
            },
            { roleId: user.roleId, roleType: user.role.type }
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: created };
    }

    async updateByAdmin(
        id: string,
        body: RoleUpdateRequestDto,
        user: IUser
    ): Promise<IResponseReturn<RoleDto>> {
        const updated = await this.roleDomain.updateByAdmin(
            id,
            {
                description: body.description,
                type: body.type,
            },
            { roleId: user.roleId, roleType: user.role.type }
        );
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminRoleUpdate,
                updated
            ),
        ];

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: updated };
    }

    async deleteByAdmin(
        id: string,
        user: IUser
    ): Promise<IResponseReturn<void>> {
        const deleted = await this.roleDomain.deleteByAdmin(id, {
            roleId: user.roleId,
            roleType: user.role.type,
        });
        const activityLogs = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminRoleDelete,
                deleted
            ),
        ];

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }
}
