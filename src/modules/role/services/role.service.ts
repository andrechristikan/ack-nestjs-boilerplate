import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumRoleType, Policy, Prisma, Role } from '@generated/prisma-client';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
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
import { IRoleService } from '@modules/role/interfaces/role.service.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleUtil } from '@modules/role/utils/role.util';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleService implements IRoleService {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly roleUtil: RoleUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    private storeActivityLogMetadata(role: Role): void {
        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.roleUtil.mapActivityLogMetadata(role)
        );

        return;
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

    async existById(roleId: string): Promise<IRole | null> {
        return this.roleRepository.existById(roleId);
    }

    async existByName(name: string): Promise<IRole | null> {
        return this.roleRepository.existByName(name);
    }

    async getOne(id: string): Promise<IRoleWithPolicies> {
        const role = await this.roleRepository.findOneById(id);
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    async createByAdmin(data: IRoleCreate): Promise<IRoleWithPolicies> {
        const exist = await this.roleRepository.existByName(data.name);
        if (exist) {
            throw new RoleExistException();
        }

        const created = await this.roleRepository.create(data);

        this.storeActivityLogMetadata(created);

        return created;
    }

    async updateByAdmin(
        id: string,
        data: IRoleUpdate
    ): Promise<IRoleWithPolicies> {
        const role = await this.roleRepository.existById(id);
        if (!role) {
            throw new RoleNotFoundException();
        }

        const updated = await this.roleRepository.update(id, data);

        this.storeActivityLogMetadata(updated);

        return updated;
    }

    async deleteByAdmin(id: string): Promise<Role> {
        const [role, roleUsed] = await Promise.all([
            this.roleRepository.existById(id),
            this.roleRepository.used(id),
        ]);

        if (!role) {
            throw new RoleNotFoundException();
        } else if (roleUsed) {
            throw new RoleUsedException();
        }

        const deleted = await this.roleRepository.delete(id);

        this.storeActivityLogMetadata(deleted);

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
