import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { CacheService } from '@common/cache/services/cache.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumRoleType, Prisma } from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { RoleCache } from '@modules/role/caches/role.cache';
import {
    RoleRank,
    RoleWithPoliciesCacheSchema,
} from '@modules/role/constants/role.constant';
import { RoleExistException } from '@modules/role/exceptions/role.exist.exception';
import { RoleForbiddenException } from '@modules/role/exceptions/role.forbidden.exception';
import { RoleHasPoliciesException } from '@modules/role/exceptions/role.has-policies.exception';
import { RoleImmutableException } from '@modules/role/exceptions/role.immutable.exception';
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
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleService {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly roleCache: RoleCache,
        private readonly cacheService: CacheService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

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

    async getByIdInTx(
        tx: IDatabaseTransactionClient,
        roleId: string
    ): Promise<IRole> {
        const role = await this.roleRepository.findOneByIdInTx(tx, roleId);
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

    /** Read-through over the role row with its policies. */
    async getOne(id: string): Promise<IRoleWithPolicies> {
        const cacheKey = this.roleCache.buildRoleKey(id);
        const lease = this.roleCache.buildRoleLease(id);

        const role = await this.cacheService.readThrough(
            cacheKey,
            RoleWithPoliciesCacheSchema,
            this.roleCache.roleTtlInMs,
            () => this.roleRepository.findOneWithPoliciesById(id),
            { lease }
        );
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    /** The outbox effect that drops the role's cache keys; a policy flow adds it on its own `tx`. */
    invalidateEffect(roleId: string): IOutboxEffect {
        const keys = this.roleCache.buildRoleKeys(roleId);

        return this.cacheService.invalidateEffect(keys);
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
        data: IRoleCreate,
        actor: IRoleActor
    ): Promise<IRoleWithPolicies> {
        this.assertActorOutranks(actor.roleType, data.type);

        try {
            return await this.roleRepository.createInTx(tx, roleId, data);
        } catch (err: unknown) {
            const isNameCollision = this.databaseUtil.isUniqueCollision(
                err,
                'name'
            );
            if (isNameCollision) {
                throw new RoleExistException();
            }

            throw new AppUnknownException(err);
        }
    }

    async updateByAdminInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        data: IRoleUpdate,
        actor: IRoleActor
    ): Promise<IRoleWithPolicies> {
        const role = await this.roleRepository.findOneWithPolicyCountByIdInTx(
            tx,
            id
        );
        if (!role) {
            throw new RoleNotFoundException();
        }

        this.assertNotSelf(actor.roleId, role.id);
        this.assertActorOutranks(actor.roleType, role.type);
        this.assertActorOutranks(actor.roleType, data.type);

        const changesImmutableType = this.changesImmutableType(role, data.type);
        if (changesImmutableType) {
            throw new RoleImmutableException();
        }

        const dropsToUser =
            data.type === EnumRoleType.user && role.type !== EnumRoleType.user;
        if (dropsToUser && role._count.policies > 0) {
            throw new RoleHasPoliciesException();
        }

        const updated = await this.roleRepository.updateInTx(
            tx,
            id,
            role.type,
            data
        );
        if (!updated) {
            throw new RoleNotFoundException();
        }

        const effect = this.invalidateEffect(id);
        await this.outboxService.addInTx(tx, effect);

        return updated;
    }

    async deleteByAdminInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        actor: IRoleActor
    ): Promise<IRole> {
        // Sequential by design: gate before the work it guards
        const role = await this.roleRepository.findOneByIdInTx(tx, id);
        if (!role) {
            throw new RoleNotFoundException();
        }

        this.assertNotSelf(actor.roleId, role.id);
        this.assertActorOutranks(actor.roleType, role.type);

        if (role.isImmutable) {
            throw new RoleImmutableException();
        }

        const deleted = await this.roleRepository.deleteUnusedInTx(tx, id);
        if (!deleted) {
            throw new RoleUsedException();
        }

        const effect = this.invalidateEffect(id);
        await this.outboxService.addInTx(tx, effect);

        return role;
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
