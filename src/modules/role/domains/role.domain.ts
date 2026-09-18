import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumRoleType,
    Prisma,
} from '@generated/prisma-client/client';
import type { Policy, Role } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { RoleExistException } from '@modules/role/exceptions/role.exist.exception';
import { RoleForbiddenException } from '@modules/role/exceptions/role.forbidden.exception';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RolePredefinedNotFoundException } from '@modules/role/exceptions/role.predefined-not-found.exception';
import { RoleUsedException } from '@modules/role/exceptions/role.used.exception';
import type {
    IRole,
    IRoleCreate,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleDomain {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly roleUtil: RoleUtil,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private prepareActivityLog(
        action: EnumActivityLogAction,
        role: IRole,
        timestamp: Date
    ): IActivityLogStagedEvent {
        const metadata = this.roleUtil.mapActivityLogMetadata(role, timestamp);

        return this.activityLogDomain.prepare({
            action,
            metadata,
        });
    }

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IRoleWithPolicyCount>> {
        return this.roleRepository.findWithPaginationOffsetByAdmin(
            pagination,
            type
        );
    }

    async getListCursorBySystem(
        pagination: IPaginationQueryCursorParams<Prisma.RoleWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IRoleWithPolicyCount>> {
        return this.roleRepository.findWithPaginationCursorBySystem(
            pagination,
            type
        );
    }

    async existsById(roleId: string): Promise<boolean> {
        return this.roleRepository.existsById(roleId);
    }

    async getById(roleId: string): Promise<IRole | null> {
        return this.roleRepository.findOneById(roleId);
    }

    async getByName(name: string): Promise<IRole | null> {
        return this.roleRepository.findOneByName(name);
    }

    async getOne(id: string): Promise<IRoleWithPolicies> {
        const role = await this.roleRepository.findOneWithPoliciesById(id);
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    async createByAdmin(data: IRoleCreate): Promise<IRoleWithPolicies> {
        const exist = await this.roleRepository.existsByName(data.name);
        if (exist) {
            throw new RoleExistException();
        }

        const roleId = this.databaseUtil.createId();
        const timestamp = this.helperDateService.create();
        const events = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminRoleCreate,
                { id: roleId, name: data.name, type: data.type },
                timestamp
            ),
        ];
        const created = await this.roleRepository.create(roleId, data);

        this.activityLogDomain.stagePrepared(events);

        return created;
    }

    async updateByAdmin(
        id: string,
        data: IRoleUpdate
    ): Promise<IRoleWithPolicies> {
        const role = await this.roleRepository.findOneById(id);
        if (!role) {
            throw new RoleNotFoundException();
        }

        const timestamp = this.helperDateService.create();
        const events = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminRoleUpdate,
                { id: role.id, name: role.name, type: data.type },
                timestamp
            ),
        ];
        const updated = await this.roleRepository.update(id, data);

        this.activityLogDomain.stagePrepared(events);

        return updated;
    }

    async deleteByAdmin(id: string): Promise<Role> {
        const [role, roleUsed] = await Promise.all([
            this.roleRepository.findOneById(id),
            this.roleRepository.isUsedById(id),
        ]);
        if (!role) {
            throw new RoleNotFoundException();
        } else if (roleUsed) {
            throw new RoleUsedException();
        }

        const timestamp = this.helperDateService.create();
        const events = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminRoleDelete,
                role,
                timestamp
            ),
        ];
        const deleted = await this.roleRepository.delete(id);

        this.activityLogDomain.stagePrepared(events);

        return deleted;
    }

    async validateRoleGuard(
        user: IUser | null,
        requiredRoles: EnumRoleType[]
    ): Promise<Policy[]> {
        if (!user) {
            throw new AuthJwtAccessTokenInvalidException();
        }

        const { role } = user;

        if (role.type === EnumRoleType.superAdmin) {
            return [];
        } else if (requiredRoles.length === 0) {
            throw new RolePredefinedNotFoundException();
        } else if (!requiredRoles.includes(role.type)) {
            throw new RoleForbiddenException();
        }

        return role.policies;
    }
}
