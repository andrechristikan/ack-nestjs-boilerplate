import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumRoleType,
    Policy,
    Prisma,
    Role,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { RoleExistException } from '@modules/role/exceptions/role.exist.exception';
import { RoleForbiddenException } from '@modules/role/exceptions/role.forbidden.exception';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RolePredefinedNotFoundException } from '@modules/role/exceptions/role.predefined-not-found.exception';
import { RoleUsedException } from '@modules/role/exceptions/role.used.exception';
import {
    IRole,
    IRoleCreate,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleUtil } from '@modules/role/utils/role.util';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleDomain {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly roleUtil: RoleUtil,
        private readonly activityLogDomain: ActivityLogDomain
    ) {}

    private stageActivityLog(action: EnumActivityLogAction, role: Role): void {
        this.activityLogDomain.stage({
            action,
            metadata: this.roleUtil.mapActivityLogMetadata(role),
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

        const created = await this.roleRepository.create(data);

        this.stageActivityLog(EnumActivityLogAction.adminRoleCreate, created);

        return created;
    }

    async updateByAdmin(
        id: string,
        data: IRoleUpdate
    ): Promise<IRoleWithPolicies> {
        const roleExists = await this.roleRepository.existsById(id);
        if (!roleExists) {
            throw new RoleNotFoundException();
        }

        const updated = await this.roleRepository.update(id, data);

        this.stageActivityLog(EnumActivityLogAction.adminRoleUpdate, updated);

        return updated;
    }

    async deleteByAdmin(id: string): Promise<Role> {
        const [roleExists, roleUsed] = await Promise.all([
            this.roleRepository.existsById(id),
            this.roleRepository.isUsedById(id),
        ]);

        if (!roleExists) {
            throw new RoleNotFoundException();
        } else if (roleUsed) {
            throw new RoleUsedException();
        }

        const deleted = await this.roleRepository.delete(id);

        this.stageActivityLog(EnumActivityLogAction.adminRoleDelete, deleted);

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
