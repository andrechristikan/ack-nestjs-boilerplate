import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumRoleScope } from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import {
    RoleCustomPlatformRank,
    RoleRank,
} from '@modules/role/constants/role.constant';
import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { RoleExistException } from '@modules/role/exceptions/role.exist.exception';
import { RoleImmutableException } from '@modules/role/exceptions/role.immutable.exception';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import { RoleScopeMismatchException } from '@modules/role/exceptions/role.scope-mismatch.exception';
import { RoleSelfForbiddenException } from '@modules/role/exceptions/role.self-forbidden.exception';
import { RoleUsedException } from '@modules/role/exceptions/role.used.exception';
import type {
    IRole,
    IRoleActor,
    IRoleCreate,
    IRoleRef,
    IRoleScopeKey,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleService {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    private rankOf(key: string): number {
        const ranks: Record<string, number> = RoleRank;

        return Object.values<string>(EnumRolePlatformKey).includes(key)
            ? ranks[key]!
            : RoleCustomPlatformRank;
    }

    private outranks(actorRoleKey: string, target: IRoleScopeKey): boolean {
        if (
            actorRoleKey === EnumRolePlatformKey.superAdmin ||
            target.scope !== EnumRoleScope.platform
        ) {
            return true;
        }

        const actorRank = this.rankOf(actorRoleKey);
        const targetRank = this.rankOf(target.key);

        return actorRank > targetRank;
    }

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams,
        scope: Record<string, IPaginationIn> | null,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.roleRepository.findWithPaginationOffsetByAdmin(
            pagination,
            scope,
            additionalWhere
        );
    }

    async getListCursorByShared(
        pagination: IPaginationQueryCursorParams,
        scope: EnumRoleScope
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.roleRepository.findWithPaginationCursorByShared(
            pagination,
            scope
        );
    }

    async getListCursorBySystem(
        pagination: IPaginationQueryCursorParams,
        scope: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.roleRepository.findWithPaginationCursorBySystem(
            pagination,
            scope
        );
    }

    async assertExistsById(
        roleId: string,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<void> {
        const roleExists = await this.roleRepository.existsById(
            roleId,
            additionalWhere
        );
        if (!roleExists) {
            throw new RoleNotFoundException();
        }
    }

    /** The role with its policies, inside the caller's predicate; an unreachable role answers not found. */
    async getOneWithPolicies(
        roleId: string,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IRoleWithPolicies> {
        const role = await this.roleRepository.findOneWithPoliciesById(
            roleId,
            additionalWhere
        );
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    /** Gates a write on a role: it is reachable, the actor does not hold it, and the actor outranks it. */
    async getWritableByActor(
        roleId: string,
        actor: IRoleActor,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IRole> {
        const role = await this.roleRepository.findOneById(
            roleId,
            additionalWhere
        );
        if (!role) {
            throw new RoleNotFoundException();
        }

        this.assertNotSelf(actor.roleId, role.id);
        this.assertActorOutranks(actor.roleKey, role);

        return role;
    }

    async getByIdInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IRole> {
        const role = await this.roleRepository.findOneByIdInTx(
            tx,
            roleId,
            additionalWhere
        );
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    async getRefByScopeAndKey(
        scope: EnumRoleScope,
        key: string
    ): Promise<IRoleRef> {
        const role = await this.roleRepository.findOneRefByScopeAndKey(
            scope,
            key
        );
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    async getRefByScopeAndKeyInTx(
        tx: IDatabaseTransactionClient,
        scope: EnumRoleScope,
        key: string
    ): Promise<IRoleRef> {
        const role = await this.roleRepository.findOneRefByScopeAndKeyInTx(
            tx,
            scope,
            key
        );
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    /** A role picked by id for an assignment, which must carry `scope`. */
    async getRefByIdForScope(
        roleId: string,
        scope: EnumRoleScope
    ): Promise<IRoleRef> {
        const role = await this.roleRepository.findOneRefById(roleId);
        if (!role) {
            throw new RoleNotFoundException();
        }

        this.assertScope(role, scope);

        return role;
    }

    assertScope(role: IRoleRef, scope: EnumRoleScope): void {
        if (role.scope !== scope) {
            throw new RoleScopeMismatchException();
        }
    }

    async getOneByUserId(
        userId: string,
        additionalWhere: Prisma.UserWhereInput | null
    ): Promise<IRole> {
        const role = await this.roleRepository.findOneByUserId(
            userId,
            additionalWhere
        );
        if (!role) {
            throw new UserNotFoundException();
        }

        return role;
    }

    async createByAdminInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        data: IRoleCreate,
        actor: IRoleActor
    ): Promise<IRoleWithPolicies> {
        this.assertActorOutranks(actor.roleKey, data);
        try {
            return await this.roleRepository.createInTx(tx, roleId, data);
        } catch (err: unknown) {
            const isKeyCollision = this.databaseUtil.isUniqueCollision(
                err,
                'key'
            );
            if (isKeyCollision) {
                throw new RoleExistException();
            }
            throw new AppUnknownException(err);
        }
    }

    async updateByAdminInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        data: IRoleUpdate,
        actor: IRoleActor,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IRoleWithPolicies> {
        // Sequential by design: gate before the work it guards
        const role = await this.getByIdInTx(tx, id, additionalWhere);
        this.assertNotSelf(actor.roleId, role.id);
        this.assertActorOutranks(actor.roleKey, role);

        const updated = await this.roleRepository.updateInTx(
            tx,
            id,
            data,
            additionalWhere
        );
        if (!updated) {
            throw new RoleNotFoundException();
        }

        return updated;
    }

    async deleteByAdminInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        actor: IRoleActor,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IRole> {
        // Sequential by design: gate before the work it guards
        const role = await this.getByIdInTx(tx, id, additionalWhere);
        this.assertNotSelf(actor.roleId, role.id);
        this.assertActorOutranks(actor.roleKey, role);
        if (role.isImmutable) {
            throw new RoleImmutableException();
        }

        const deleted = await this.roleRepository.deleteUnusedInTx(
            tx,
            id,
            additionalWhere
        );
        if (!deleted) {
            throw new RoleUsedException();
        }

        return role;
    }

    /** A policy write calls this on its own `tx`: the new revision keys a fresh cache entry for the role. */
    async bumpPolicyRevisionInTx(
        tx: IDatabaseTransactionClient,
        roleId: string
    ): Promise<void> {
        const bumped = await this.roleRepository.incrementPolicyRevisionInTx(
            tx,
            roleId
        );
        if (!bumped) {
            throw new RoleNotFoundException();
        }
    }

    assertActorOutranks(actorRoleKey: string, target: IRoleScopeKey): void {
        const outranks = this.outranks(actorRoleKey, target);
        if (!outranks) {
            throw new RoleRankForbiddenException();
        }
    }

    assertNotSelf(actorRoleId: string, targetRoleId: string): void {
        if (actorRoleId === targetRoleId) {
            throw new RoleSelfForbiddenException();
        }
    }
}
