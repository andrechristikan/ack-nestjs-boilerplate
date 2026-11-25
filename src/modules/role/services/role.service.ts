import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumRoleType } from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { RoleRank } from '@modules/role/constants/role.constant';
import { RoleForbiddenException } from '@modules/role/exceptions/role.forbidden.exception';
import { RoleHasPoliciesException } from '@modules/role/exceptions/role.has-policies.exception';
import { RoleImmutableException } from '@modules/role/exceptions/role.immutable.exception';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import { RoleSelfForbiddenException } from '@modules/role/exceptions/role.self-forbidden.exception';
import type {
    IRole,
    IRoleActor,
    IRoleCreate,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleService {
    constructor(private readonly roleRepository: RoleRepository) {}

    private outranks(
        actorRoleType: EnumRoleType,
        targetRoleType: EnumRoleType
    ): boolean {
        return (
            actorRoleType === EnumRoleType.superAdmin ||
            RoleRank[actorRoleType] > RoleRank[targetRoleType]
        );
    }

    private changesImmutableType(role: IRole, type: EnumRoleType): boolean {
        return role.isImmutable && role.type !== type;
    }

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.roleRepository.findWithPaginationOffsetByAdmin(
            pagination,
            type ?? null
        );
    }

    async getListCursorBySystem(
        pagination: IPaginationQueryCursorParams,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.roleRepository.findWithPaginationCursorBySystem(
            pagination,
            type ?? null
        );
    }

    /** Reads the role a write targets and returns it: it exists, the actor does not hold it, and the actor outranks it. */
    async getWritableByActor(
        roleId: string,
        actor: IRoleActor
    ): Promise<IRole> {
        const role = await this.roleRepository.findOneById(roleId);
        if (!role) {
            throw new RoleNotFoundException();
        }

        this.assertNotSelf(actor.roleId, role.id);
        this.assertActorOutranks(actor.roleType, role.type);

        return role;
    }

    /** Reads the role with its policy count and returns it when the actor may apply the update to it. */
    async getUpdatableByActor(
        actor: IRoleActor,
        roleId: string,
        update: IRoleUpdate
    ): Promise<IRoleWithPolicyCount> {
        const role =
            await this.roleRepository.findOneWithPolicyCountById(roleId);
        if (!role) {
            throw new RoleNotFoundException();
        }

        this.assertNotSelf(actor.roleId, role.id);
        this.assertActorOutranks(actor.roleType, role.type);
        this.assertActorOutranks(actor.roleType, update.type);

        const changesImmutableType = this.changesImmutableType(
            role,
            update.type
        );
        if (changesImmutableType) {
            throw new RoleImmutableException();
        }

        const dropsToUser =
            update.type === EnumRoleType.user &&
            role.type !== EnumRoleType.user;
        if (dropsToUser && role._count.policies > 0) {
            throw new RoleHasPoliciesException();
        }

        return role;
    }

    /** Reads the role and returns it when the actor may delete it. */
    async getDeletableByActor(
        actor: IRoleActor,
        roleId: string
    ): Promise<IRole> {
        const role = await this.roleRepository.findOneById(roleId);
        if (!role) {
            throw new RoleNotFoundException();
        }

        this.assertNotSelf(actor.roleId, role.id);
        this.assertActorOutranks(actor.roleType, role.type);

        if (role.isImmutable) {
            throw new RoleImmutableException();
        }

        return role;
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

    async getOneWithPolicies(roleId: string): Promise<IRoleWithPolicies> {
        const role = await this.roleRepository.findOneWithPoliciesById(roleId);
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    assertActorOutranks(
        actorRoleType: EnumRoleType,
        targetRoleType: EnumRoleType
    ): void {
        const outranks = this.outranks(actorRoleType, targetRoleType);
        if (!outranks) {
            throw new RoleRankForbiddenException();
        }
    }

    assertNotSelf(actorRoleId: string, targetRoleId: string): void {
        if (actorRoleId === targetRoleId) {
            throw new RoleSelfForbiddenException();
        }
    }

    async createByAdminInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        data: IRoleCreate
    ): Promise<IRoleWithPolicies> {
        return this.roleRepository.createInTx(tx, roleId, data);
    }

    async updateByAdminInTx(
        tx: IDatabaseTransactionClient,
        role: IRoleWithPolicyCount,
        data: IRoleUpdate
    ): Promise<IRoleWithPolicies> {
        return this.roleRepository.updateInTx(tx, role.id, role.type, data);
    }

    async deleteByAdminInTx(
        tx: IDatabaseTransactionClient,
        role: IRole
    ): Promise<IRole> {
        return this.roleRepository.deleteUnusedInTx(tx, role.id);
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

        return role.type === EnumRoleType.user ? [] : role.policies;
    }
}
