import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumRoleType, Prisma } from '@generated/prisma-client/client';
import type { Policy, Role } from '@generated/prisma-client/client';
import { RoleExistException } from '@modules/role/exceptions/role.exist.exception';
import { RoleForbiddenException } from '@modules/role/exceptions/role.forbidden.exception';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import { RoleSelfForbiddenException } from '@modules/role/exceptions/role.self-forbidden.exception';
import { RoleUsedException } from '@modules/role/exceptions/role.used.exception';
import type {
    IRole,
    IRoleActor,
    IRoleCreate,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleUtil } from '@modules/role/utils/role.util';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleDomain {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly roleUtil: RoleUtil
    ) {}

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.roleRepository.findWithPaginationOffsetByAdmin(
            pagination,
            type ?? null
        );
    }

    async getListCursorBySystem(
        pagination: IPaginationQueryCursorParams<Prisma.RoleWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.roleRepository.findWithPaginationCursorBySystem(
            pagination,
            type ?? null
        );
    }

    async assertExistsById(roleId: string): Promise<void> {
        const roleExists = await this.roleRepository.existsById(roleId);
        if (!roleExists) {
            throw new RoleNotFoundException();
        }
    }

    /** Gates a write on a role: it exists, the actor does not hold it, and the actor outranks it. */
    async assertWritableByActor(
        roleId: string,
        actor: IRoleActor
    ): Promise<void> {
        const role = await this.roleRepository.findOneById(roleId);
        if (!role) {
            throw new RoleNotFoundException();
        }

        this.assertNotSelf(actor.roleId, role.id);
        this.assertActorOutranks(actor.roleType, role.type);
    }

    async getById(roleId: string): Promise<IRole> {
        const role = await this.roleRepository.findOneById(roleId);
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    async getByName(name: string): Promise<IRole> {
        const role = await this.roleRepository.findOneByName(name);
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    async getOneByUserId(userId: string): Promise<IRole> {
        const role = await this.roleRepository.findOneByUserId(userId);
        if (!role) {
            throw new UserNotFoundException();
        }

        return role;
    }

    async getOne(id: string): Promise<IRoleWithPolicies> {
        const role = await this.roleRepository.findOneWithPoliciesById(id);
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    assertActorOutranks(
        actorRoleType: EnumRoleType,
        targetRoleType: EnumRoleType
    ): void {
        const outranks = this.roleUtil.outranks(actorRoleType, targetRoleType);
        if (!outranks) {
            throw new RoleRankForbiddenException();
        }
    }

    assertNotSelf(actorRoleId: string, targetRoleId: string): void {
        if (actorRoleId === targetRoleId) {
            throw new RoleSelfForbiddenException();
        }
    }

    async createByAdmin(
        roleId: string,
        data: IRoleCreate,
        actor: IRoleActor
    ): Promise<IRoleWithPolicies> {
        this.assertActorOutranks(actor.roleType, data.type);

        // Sequential by design: gate before the work it guards
        const exist = await this.roleRepository.existsByName(data.name);
        if (exist) {
            throw new RoleExistException();
        }

        return this.roleRepository.create(roleId, data);
    }

    async updateByAdmin(
        id: string,
        data: IRoleUpdate,
        actor: IRoleActor
    ): Promise<IRoleWithPolicies> {
        // Sequential by design: gate before the work it guards
        await this.assertWritableByActor(id, actor);
        this.assertActorOutranks(actor.roleType, data.type);

        return this.roleRepository.update(id, data);
    }

    async deleteByAdmin(id: string, actor: IRoleActor): Promise<Role> {
        // Sequential by design: gate before the work it guards
        const [role, roleUsed] = await Promise.all([
            this.roleRepository.findOneById(id),
            this.roleRepository.isUsedById(id),
        ]);
        if (!role) {
            throw new RoleNotFoundException();
        }

        this.assertNotSelf(actor.roleId, role.id);
        this.assertActorOutranks(actor.roleType, role.type);

        if (roleUsed) {
            throw new RoleUsedException();
        }

        return this.roleRepository.delete(id);
    }

    async validateRoleGuard(
        user: IUser,
        requiredRoles: EnumRoleType[]
    ): Promise<Policy[]> {
        const { role } = user;

        if (role.type === EnumRoleType.superAdmin) {
            return [];
        } else if (!requiredRoles.includes(role.type)) {
            throw new RoleForbiddenException();
        }

        return role.policies;
    }
}
