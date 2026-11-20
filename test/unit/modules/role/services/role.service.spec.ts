import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { CacheService } from '@common/cache/services/cache.service';
import {
    EnumCacheProcess,
    EnumCacheQueue,
} from '@common/cache/enums/cache.enum';
import type {
    ICacheInvalidateEffect,
    ICacheLease,
} from '@common/cache/interfaces/cache.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { ConfigService } from '@nestjs/config';
import { DatabaseUniqueConstraintCode } from '@common/database/constants/database.constant';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationCursorReturn,
    IPaginationOffsetReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumRoleType, Prisma } from '@generated/prisma-client/client';
import type { Role } from '@generated/prisma-client/client';
import { RoleCache } from '@modules/role/caches/role.cache';
import { RoleWithPoliciesCacheSchema } from '@modules/role/constants/role.constant';
import { RoleService } from '@modules/role/services/role.service';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type {
    IRoleActor,
    IRoleCreate,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { buildUser } from '@test/unit/helpers/test.unit.request.helper';

describe('RoleService', () => {
    const roleRepository: MockProxy<RoleRepository> = mock<RoleRepository>();
    const roleCache: MockProxy<RoleCache> = mock<RoleCache>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();
    const roleKeys = ['Role:role-1', 'Role:Lease:role-1'];
    const roleLease: ICacheLease = {
        key: 'Role:Lease:role-1',
        ttlInMs: 10000,
    };
    const cacheEffect: ICacheInvalidateEffect = {
        queue: EnumCacheQueue.cache,
        name: EnumCacheProcess.invalidate,
        data: { keys: roleKeys },
        priority: EnumQueuePriority.high,
        idempotencyKey: null,
    };

    const now = new Date('2026-01-15T00:00:00.000Z');
    const roleWithPolicies: IRoleWithPolicies = {
        id: 'role-1',
        name: 'manager',
        description: null,
        type: EnumRoleType.admin,
        isImmutable: false,
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
        policies: [],
    };
    const role: Role = {
        id: roleWithPolicies.id,
        name: roleWithPolicies.name,
        description: roleWithPolicies.description,
        type: roleWithPolicies.type,
        isImmutable: roleWithPolicies.isImmutable,
        createdAt: roleWithPolicies.createdAt,
        createdBy: roleWithPolicies.createdBy,
        updatedAt: roleWithPolicies.updatedAt,
        updatedBy: roleWithPolicies.updatedBy,
    };

    const superAdminActor: IRoleActor = {
        roleId: 'role-root',
        roleType: EnumRoleType.superAdmin,
    };
    const adminActor: IRoleActor = {
        roleId: 'role-actor',
        roleType: EnumRoleType.admin,
    };
    const superAdminRole: Role = {
        ...role,
        id: 'role-root',
        name: 'superadmin',
        type: EnumRoleType.superAdmin,
    };
    const immutableRole: Role = { ...role, isImmutable: true };

    let service: RoleService;

    beforeEach(async () => {
        roleCache.buildRoleKey.mockReturnValue('Role:role-1');
        roleCache.buildRoleLease.mockReturnValue(roleLease);
        roleCache.buildRoleKeys.mockReturnValue(roleKeys);
        cacheService.invalidateEffect.mockReturnValue(cacheEffect);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleService,
                { provide: RoleRepository, useValue: roleRepository },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: RoleCache, useValue: roleCache },
                { provide: CacheService, useValue: cacheService },
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();

        service = module.get(RoleService);
    });

    describe('getListOffsetByAdmin', () => {
        it('delegates the offset pagination read to the repository', async () => {
            const pagination: IPaginationQueryOffsetParams = {
                skip: 0,
                limit: 20,
                orderBy: [],
            };
            const page: IPaginationOffsetReturn<IRoleWithPolicyCount> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            roleRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                page
            );

            const result = await service.getListOffsetByAdmin(pagination);

            expect(result).toBe(page);
            expect(
                roleRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination, null);
        });

        it('forwards the type filter to the repository', async () => {
            const pagination: IPaginationQueryOffsetParams = {
                skip: 0,
                limit: 20,
                orderBy: [],
            };
            const page: IResponsePaginationReturn<IRoleWithPolicyCount> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            const type = { type: { in: ['admin'] } };
            roleRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                page
            );

            const result = await service.getListOffsetByAdmin(pagination, type);

            expect(result).toBe(page);
            expect(
                roleRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination, type);
        });
    });

    describe('getListCursorBySystem', () => {
        it('delegates the cursor pagination read to the repository', async () => {
            const pagination: IPaginationQueryCursorParams = {
                fingerprint: 'aaaaaaaaaaaaaaaa',
                limit: 20,
                orderBy: [],
            };
            const page: IPaginationCursorReturn<IRoleWithPolicyCount> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            roleRepository.findWithPaginationCursorBySystem.mockResolvedValue(
                page
            );

            const result = await service.getListCursorBySystem(pagination);

            expect(result).toBe(page);
            expect(
                roleRepository.findWithPaginationCursorBySystem
            ).toHaveBeenCalledWith(pagination, null);
        });

        it('forwards the type filter to the repository', async () => {
            const pagination: IPaginationQueryCursorParams = {
                fingerprint: 'aaaaaaaaaaaaaaaa',
                limit: 20,
                orderBy: [],
            };
            const page: IResponsePaginationReturn<IRoleWithPolicyCount> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            const type = { type: { in: ['admin'] } };
            roleRepository.findWithPaginationCursorBySystem.mockResolvedValue(
                page
            );

            const result = await service.getListCursorBySystem(
                pagination,
                type
            );

            expect(result).toBe(page);
            expect(
                roleRepository.findWithPaginationCursorBySystem
            ).toHaveBeenCalledWith(pagination, type);
        });
    });

    describe('getById', () => {
        it('returns the role the repository reads', async () => {
            roleRepository.findOneById.mockResolvedValue(role);

            const result = await service.getById(role.id);

            expect(result).toBe(role);
        });

        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.findOneById.mockResolvedValue(null);

            await expect(service.getById('missing')).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
        });
    });

    describe('getByIdInTx', () => {
        it('returns the role read on the tx', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(role);

            const result = await service.getByIdInTx(tx, role.id);

            expect(result).toBe(role);
            expect(roleRepository.findOneByIdInTx).toHaveBeenCalledWith(
                tx,
                role.id
            );
        });

        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(null);

            await expect(
                service.getByIdInTx(tx, 'missing')
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
        });
    });

    describe('getByName', () => {
        it('returns the role the repository reads', async () => {
            roleRepository.findOneByName.mockResolvedValue(role);

            const result = await service.getByName(role.name);

            expect(result).toBe(role);
            expect(roleRepository.findOneByName).toHaveBeenCalledWith(
                role.name
            );
        });

        it('throws RoleNotFoundException when no role carries the name', async () => {
            roleRepository.findOneByName.mockResolvedValue(null);

            await expect(service.getByName('missing')).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
        });
    });

    describe('getOneWithPolicies', () => {
        it('reads the role with its policies from the repository once and never through the cache', async () => {
            roleRepository.findOneWithPoliciesById.mockResolvedValue(
                roleWithPolicies
            );

            const result = await service.getOneWithPolicies(role.id);

            expect(result).toBe(roleWithPolicies);
            expect(
                roleRepository.findOneWithPoliciesById
            ).toHaveBeenCalledTimes(1);
            expect(roleRepository.findOneWithPoliciesById).toHaveBeenCalledWith(
                role.id
            );
            expect(cacheService.readThrough).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException when the repository answers null', async () => {
            roleRepository.findOneWithPoliciesById.mockResolvedValue(null);

            await expect(
                service.getOneWithPolicies('missing')
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
        });
    });

    describe('getOne', () => {
        beforeEach(() => {
            Object.assign(roleCache, { cacheTtlInMs: 900000 });
        });

        it('reads through with the role key, RoleWithPoliciesCacheSchema, the TTL, a loader, and the lease', async () => {
            cacheService.readThrough.mockResolvedValue(roleWithPolicies);

            const result = await service.getOne(role.id);

            expect(result).toBe(roleWithPolicies);
            expect(roleCache.buildRoleKey).toHaveBeenCalledWith(role.id);
            expect(roleCache.buildRoleLease).toHaveBeenCalledWith(role.id);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'Role:role-1',
                RoleWithPoliciesCacheSchema,
                900000,
                expect.any(Function),
                { lease: roleLease }
            );
        });

        it('passes a loader that reads the role with its policies', async () => {
            cacheService.readThrough.mockImplementation(
                async (_key, _schema, _ttlInMs, loader) => loader()
            );
            roleRepository.findOneWithPoliciesById.mockResolvedValue(
                roleWithPolicies
            );

            const result = await service.getOne(role.id);

            expect(result).toBe(roleWithPolicies);
            expect(roleRepository.findOneWithPoliciesById).toHaveBeenCalledWith(
                role.id
            );
        });

        it('throws RoleNotFoundException when the read-through answers null', async () => {
            cacheService.readThrough.mockResolvedValue(null);

            await expect(service.getOne('missing')).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
        });
    });

    describe('invalidateEffect', () => {
        it('builds the invalidate effect over the entry and lease keys', () => {
            const result = service.invalidateEffect(role.id);

            expect(result).toBe(cacheEffect);
            expect(roleCache.buildRoleKeys).toHaveBeenCalledWith(role.id);
            expect(cacheService.invalidateEffect).toHaveBeenCalledWith(
                roleKeys
            );
        });
    });

    describe('createByAdminInTx', () => {
        const create: IRoleCreate = {
            name: 'manager',
            description: null,
            type: EnumRoleType.admin,
        };

        it('throws RoleExistException when the create collides on the name index, with no read before the write', async () => {
            const collision = new Prisma.PrismaClientKnownRequestError(
                'name collision',
                {
                    code: DatabaseUniqueConstraintCode,
                    clientVersion: 'test',
                    meta: { target: ['name'] },
                }
            );
            roleRepository.createInTx.mockRejectedValue(collision);

            await expect(
                service.createByAdminInTx(tx, role.id, create, superAdminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.exist,
            });
        });

        it('wraps a non-collision create error in AppUnknownException', async () => {
            const otherError = new Error('unexpected');
            roleRepository.createInTx.mockRejectedValue(otherError);

            await expect(
                service.createByAdminInTx(tx, role.id, create, superAdminActor)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
        });

        it('throws RoleRankForbiddenException when an admin creates an admin-type role', async () => {
            await expect(
                service.createByAdminInTx(tx, role.id, create, adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
            expect(roleRepository.createInTx).not.toHaveBeenCalled();
        });

        it('creates a user-type role for an admin actor', async () => {
            const userCreate: IRoleCreate = {
                ...create,
                type: EnumRoleType.user,
            };
            roleRepository.createInTx.mockResolvedValue(roleWithPolicies);

            const result = await service.createByAdminInTx(
                tx,
                role.id,
                userCreate,
                adminActor
            );

            expect(result).toBe(roleWithPolicies);
            expect(roleRepository.createInTx).toHaveBeenCalledWith(
                tx,
                role.id,
                userCreate
            );
        });

        it('creates the role under the given id', async () => {
            roleRepository.createInTx.mockResolvedValue(roleWithPolicies);

            const result = await service.createByAdminInTx(
                tx,
                role.id,
                create,
                superAdminActor
            );

            expect(result).toBe(roleWithPolicies);
            expect(roleRepository.createInTx).toHaveBeenCalledWith(
                tx,
                role.id,
                create
            );
        });
    });

    describe('updateByAdminInTx', () => {
        const update: IRoleUpdate = {
            description: null,
            type: EnumRoleType.user,
        };

        it('reads the role through the policy-count read on the tx', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...role,
                _count: { policies: 0 },
            });
            roleRepository.updateInTx.mockResolvedValue(roleWithPolicies);

            await service.updateByAdminInTx(
                tx,
                role.id,
                update,
                superAdminActor
            );

            expect(
                roleRepository.findOneWithPolicyCountByIdInTx
            ).toHaveBeenCalledWith(tx, role.id);
        });

        it('throws RoleHasPoliciesException when the type changes to user while the role holds a policy', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...role,
                _count: { policies: 2 },
            });

            await expect(
                service.updateByAdminInTx(tx, role.id, update, superAdminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.hasPolicies,
            });
            expect(roleRepository.updateInTx).not.toHaveBeenCalled();
        });

        it('updates to user when the role holds no policy', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...role,
                _count: { policies: 0 },
            });
            roleRepository.updateInTx.mockResolvedValue(roleWithPolicies);

            const result = await service.updateByAdminInTx(
                tx,
                role.id,
                update,
                superAdminActor
            );

            expect(result).toBe(roleWithPolicies);
        });

        it('updates a user role that holds policies when the type stays user', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...role,
                type: EnumRoleType.user,
                _count: { policies: 1 },
            });
            roleRepository.updateInTx.mockResolvedValue(roleWithPolicies);

            await service.updateByAdminInTx(
                tx,
                role.id,
                update,
                superAdminActor
            );

            expect(roleRepository.updateInTx).toHaveBeenCalled();
        });

        it('answers the immutable refusal whatever the policy count', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...immutableRole,
                _count: { policies: 3 },
            });

            await expect(
                service.updateByAdminInTx(
                    tx,
                    immutableRole.id,
                    update,
                    superAdminActor
                )
            ).rejects.toMatchObject({
                module: 'role',

                statusCode: EnumRoleStatusCodeError.immutable,
            });
            expect(roleRepository.updateInTx).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue(
                null
            );

            await expect(
                service.updateByAdminInTx(tx, 'missing', update, adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
        });

        it('throws RoleSelfForbiddenException when the actor updates the role they hold', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...role,
                _count: { policies: 0 },
            });

            await expect(
                service.updateByAdminInTx(tx, role.id, update, {
                    roleId: role.id,
                    roleType: EnumRoleType.admin,
                })
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.selfForbidden,
            });
            expect(roleRepository.updateInTx).not.toHaveBeenCalled();
        });

        it('throws RoleRankForbiddenException when an admin updates a superAdmin role', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...superAdminRole,
                _count: { policies: 0 },
            });

            await expect(
                service.updateByAdminInTx(
                    tx,
                    superAdminRole.id,
                    update,
                    adminActor
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
            expect(roleRepository.updateInTx).not.toHaveBeenCalled();
        });

        it('throws RoleRankForbiddenException when an admin updates an admin role', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...role,
                _count: { policies: 0 },
            });

            await expect(
                service.updateByAdminInTx(tx, role.id, update, adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
            expect(roleRepository.updateInTx).not.toHaveBeenCalled();
        });

        it('throws RoleRankForbiddenException when an admin raises a user role to admin', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...role,
                type: EnumRoleType.user,
                _count: { policies: 0 },
            });

            await expect(
                service.updateByAdminInTx(
                    tx,
                    role.id,
                    { description: null, type: EnumRoleType.admin },
                    adminActor
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
            expect(roleRepository.updateInTx).not.toHaveBeenCalled();
        });

        it('throws RoleImmutableException when the type of an immutable role changes', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...immutableRole,
                _count: { policies: 0 },
            });

            await expect(
                service.updateByAdminInTx(
                    tx,
                    immutableRole.id,
                    update,
                    superAdminActor
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.immutable,
            });
            expect(roleRepository.updateInTx).not.toHaveBeenCalled();
        });

        it('writes the description of an immutable role when the type stays', async () => {
            const sameType: IRoleUpdate = {
                description: 'Team lead role',
                type: immutableRole.type,
            };
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...immutableRole,
                _count: { policies: 0 },
            });
            roleRepository.updateInTx.mockResolvedValue(roleWithPolicies);

            const result = await service.updateByAdminInTx(
                tx,
                immutableRole.id,
                sameType,
                superAdminActor
            );

            expect(result).toBe(roleWithPolicies);
            expect(roleRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                immutableRole.id,
                immutableRole.type,
                sameType
            );
        });

        it('answers the rank exception ahead of the immutable refusal', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...immutableRole,
                _count: { policies: 0 },
            });

            await expect(
                service.updateByAdminInTx(
                    tx,
                    immutableRole.id,
                    update,
                    adminActor
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
            expect(roleRepository.updateInTx).not.toHaveBeenCalled();
        });

        it('updates a user role for an admin actor', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...role,
                type: EnumRoleType.user,
                _count: { policies: 0 },
            });
            roleRepository.updateInTx.mockResolvedValue(roleWithPolicies);

            const result = await service.updateByAdminInTx(
                tx,
                role.id,
                update,
                adminActor
            );

            expect(result).toBe(roleWithPolicies);
            expect(roleRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                role.id,
                EnumRoleType.user,
                update
            );
        });

        it('updates the role and returns it', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...role,
                _count: { policies: 0 },
            });
            roleRepository.updateInTx.mockResolvedValue(roleWithPolicies);

            const result = await service.updateByAdminInTx(
                tx,
                role.id,
                update,
                superAdminActor
            );

            expect(result).toBe(roleWithPolicies);
            expect(roleRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                role.id,
                role.type,
                update
            );
            expect(roleCache.buildRoleKeys).toHaveBeenCalledWith(role.id);
            expect(cacheService.invalidateEffect).toHaveBeenCalledWith(
                roleKeys
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, cacheEffect);
        });

        it("passes the read's type to the guarded write", async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...role,
                type: EnumRoleType.user,
                _count: { policies: 0 },
            });
            roleRepository.updateInTx.mockResolvedValue(roleWithPolicies);

            await service.updateByAdminInTx(
                tx,
                role.id,
                { description: null, type: EnumRoleType.admin },
                superAdminActor
            );

            expect(roleRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                role.id,
                EnumRoleType.user,
                { description: null, type: EnumRoleType.admin }
            );
        });

        it('throws RoleNotFoundException when the guarded write misses', async () => {
            roleRepository.findOneWithPolicyCountByIdInTx.mockResolvedValue({
                ...role,
                _count: { policies: 0 },
            });
            roleRepository.updateInTx.mockResolvedValue(null);

            await expect(
                service.updateByAdminInTx(tx, role.id, update, superAdminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
        });
    });

    describe('deleteByAdminInTx', () => {
        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(null);

            await expect(
                service.deleteByAdminInTx(tx, 'missing', adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
            expect(roleRepository.deleteUnusedInTx).not.toHaveBeenCalled();
        });

        it('throws RoleUsedException when the guarded delete matches no unused role', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(role);
            roleRepository.deleteUnusedInTx.mockResolvedValue(false);

            await expect(
                service.deleteByAdminInTx(tx, role.id, superAdminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.used,
            });
            expect(roleRepository.deleteUnusedInTx).toHaveBeenCalledWith(
                tx,
                role.id
            );
        });

        it('throws RoleSelfForbiddenException when the actor deletes the role they hold', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(role);

            await expect(
                service.deleteByAdminInTx(tx, role.id, {
                    roleId: role.id,
                    roleType: EnumRoleType.superAdmin,
                })
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.selfForbidden,
            });
            expect(roleRepository.deleteUnusedInTx).not.toHaveBeenCalled();
        });

        it('throws RoleRankForbiddenException when an admin deletes a superAdmin role', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(superAdminRole);

            await expect(
                service.deleteByAdminInTx(tx, superAdminRole.id, adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
            expect(roleRepository.deleteUnusedInTx).not.toHaveBeenCalled();
        });

        it('throws RoleImmutableException for an immutable role', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(immutableRole);

            await expect(
                service.deleteByAdminInTx(tx, immutableRole.id, superAdminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.immutable,
            });
            expect(roleRepository.deleteUnusedInTx).not.toHaveBeenCalled();
        });

        it('deletes the unused role in one guarded statement and returns the role it read', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(role);
            roleRepository.deleteUnusedInTx.mockResolvedValue(true);

            const result = await service.deleteByAdminInTx(
                tx,
                role.id,
                superAdminActor
            );

            expect(result).toBe(role);
            expect(roleRepository.deleteUnusedInTx).toHaveBeenCalledWith(
                tx,
                role.id
            );
            expect(roleCache.buildRoleKeys).toHaveBeenCalledWith(role.id);
            expect(cacheService.invalidateEffect).toHaveBeenCalledWith(
                roleKeys
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, cacheEffect);
        });
    });

    describe('assertWritableByActor', () => {
        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.assertWritableByActor('missing', adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
        });

        it('throws RoleSelfForbiddenException when the actor holds the role', async () => {
            roleRepository.findOneById.mockResolvedValue(role);

            await expect(
                service.assertWritableByActor(role.id, {
                    roleId: role.id,
                    roleType: EnumRoleType.admin,
                })
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.selfForbidden,
            });
        });

        it('throws RoleRankForbiddenException when the actor does not outrank the role', async () => {
            roleRepository.findOneById.mockResolvedValue(superAdminRole);

            await expect(
                service.assertWritableByActor(superAdminRole.id, adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
        });

        it('resolves when the actor outranks a role it does not hold', async () => {
            roleRepository.findOneById.mockResolvedValue(role);

            await expect(
                service.assertWritableByActor(role.id, superAdminActor)
            ).resolves.toBeUndefined();
        });
    });

    describe('assertActorOutranks', () => {
        it('passes when the actor outranks the target', () => {
            expect(() =>
                service.assertActorOutranks(
                    EnumRoleType.admin,
                    EnumRoleType.user
                )
            ).not.toThrow();
        });

        it('throws RoleRankForbiddenException when the actor does not outrank the target', () => {
            expect(() =>
                service.assertActorOutranks(
                    EnumRoleType.admin,
                    EnumRoleType.admin
                )
            ).toThrow(
                expect.objectContaining({
                    module: 'role',
                    statusCode: EnumRoleStatusCodeError.rankForbidden,
                })
            );
        });
    });

    describe('assertNotSelf', () => {
        it('passes for a different role id', () => {
            expect(() =>
                service.assertNotSelf('role-a', 'role-b')
            ).not.toThrow();
        });

        it('throws RoleSelfForbiddenException for the same role id', () => {
            expect(() => service.assertNotSelf('role-a', 'role-a')).toThrow(
                expect.objectContaining({
                    module: 'role',
                    statusCode: EnumRoleStatusCodeError.selfForbidden,
                })
            );
        });
    });

    describe('validateRoleGuard', () => {
        const baseUser: IUser = buildUser('user-1', 'john@example.com');

        it('returns an empty policy list for a superAdmin, bypassing the required roles', async () => {
            const user = {
                ...baseUser,
                role: { ...roleWithPolicies, type: EnumRoleType.superAdmin },
            };

            const result = await service.validateRoleGuard(user, []);

            expect(result).toEqual([]);
        });

        it('returns an empty policy list for a user role in the required list', async () => {
            const user = {
                ...baseUser,
                role: { ...roleWithPolicies, type: EnumRoleType.user },
            };

            const result = await service.validateRoleGuard(user, [
                EnumRoleType.user,
            ]);

            expect(result).toEqual([]);
        });

        it('throws RoleForbiddenException when the caller role is not in the required list', async () => {
            const user = {
                ...baseUser,
                role: { ...roleWithPolicies, type: EnumRoleType.user },
            };

            await expect(
                service.validateRoleGuard(user, [EnumRoleType.admin])
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.forbidden,
            });
        });

        it('returns the caller policies when the caller role is in the required list', async () => {
            const user = {
                ...baseUser,
                role: { ...roleWithPolicies, type: EnumRoleType.admin },
            };

            const result = await service.validateRoleGuard(user, [
                EnumRoleType.admin,
            ]);

            expect(result).toBe(user.role.policies);
        });
    });

    describe('outranks', () => {
        it.each([
            [EnumRoleType.superAdmin, EnumRoleType.superAdmin],
            [EnumRoleType.superAdmin, EnumRoleType.admin],
            [EnumRoleType.superAdmin, EnumRoleType.user],
            [EnumRoleType.admin, EnumRoleType.user],
        ])(
            'returns true for a %s actor on a %s target',
            (actorType, targetType) => {
                expect(service['outranks'](actorType, targetType)).toBe(true);
            }
        );

        it.each([
            [EnumRoleType.admin, EnumRoleType.superAdmin],
            [EnumRoleType.admin, EnumRoleType.admin],
            [EnumRoleType.user, EnumRoleType.user],
            [EnumRoleType.user, EnumRoleType.admin],
        ])(
            'returns false for a %s actor on a %s target',
            (actorType, targetType) => {
                expect(service['outranks'](actorType, targetType)).toBe(false);
            }
        );
    });

    describe('changesImmutableType', () => {
        it('returns true for an immutable role and another type', () => {
            expect(
                service['changesImmutableType'](
                    immutableRole,
                    EnumRoleType.user
                )
            ).toBe(true);
        });

        it('returns false for an immutable role and the same type', () => {
            expect(
                service['changesImmutableType'](
                    immutableRole,
                    EnumRoleType.admin
                )
            ).toBe(false);
        });

        it('returns false for a mutable role and another type', () => {
            expect(
                service['changesImmutableType'](
                    { ...immutableRole, isImmutable: false },
                    EnumRoleType.user
                )
            ).toBe(false);
        });
    });
});
