import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
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
import { RoleService } from '@modules/role/services/role.service';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleUsedException } from '@modules/role/exceptions/role.used.exception';
import type {
    IRoleActor,
    IRoleCreate,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { buildUser } from '@test/unit/helpers/test.unit.request.helper';

describe('RoleService', () => {
    const roleRepository: MockProxy<RoleRepository> = mock<RoleRepository>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

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
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleService,
                { provide: RoleRepository, useValue: roleRepository },
                { provide: OutboxService, useValue: outboxService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
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

    describe('createByAdminInTx', () => {
        const create: IRoleCreate = {
            name: 'manager',
            description: null,
            type: EnumRoleType.admin,
        };

        it('creates the role under the given id', async () => {
            roleRepository.createInTx.mockResolvedValue(roleWithPolicies);

            const result = await service.createByAdminInTx(tx, role.id, create);

            expect(result).toBe(roleWithPolicies);
            expect(roleRepository.createInTx).toHaveBeenCalledWith(
                tx,
                role.id,
                create
            );
        });

        it('lets the repository rejection through unmapped', async () => {
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
                service.createByAdminInTx(tx, role.id, create)
            ).rejects.toBe(collision);
        });
    });

    describe('getUpdatableByActor', () => {
        const update: IRoleUpdate = {
            description: null,
            type: EnumRoleType.user,
        };

        it('reads the role with its policy count on the client and returns it', async () => {
            const found = { ...role, _count: { policies: 0 } };
            roleRepository.findOneWithPolicyCountById.mockResolvedValue(found);

            const result = await service.getUpdatableByActor(
                superAdminActor,
                role.id,
                update
            );

            expect(result).toBe(found);
            expect(
                roleRepository.findOneWithPolicyCountById
            ).toHaveBeenCalledWith(role.id);
        });

        it('throws RoleHasPoliciesException when the type changes to user while the role holds a policy', async () => {
            roleRepository.findOneWithPolicyCountById.mockResolvedValue({
                ...role,
                _count: { policies: 2 },
            });

            await expect(
                service.getUpdatableByActor(superAdminActor, role.id, update)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.hasPolicies,
            });
        });

        it('returns a user role that holds policies when the type stays user', async () => {
            const found = {
                ...role,
                type: EnumRoleType.user,
                _count: { policies: 1 },
            };
            roleRepository.findOneWithPolicyCountById.mockResolvedValue(found);

            const result = await service.getUpdatableByActor(
                superAdminActor,
                role.id,
                update
            );

            expect(result).toBe(found);
        });

        it('answers the immutable refusal whatever the policy count', async () => {
            roleRepository.findOneWithPolicyCountById.mockResolvedValue({
                ...immutableRole,
                _count: { policies: 3 },
            });

            await expect(
                service.getUpdatableByActor(
                    superAdminActor,
                    immutableRole.id,
                    update
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.immutable,
            });
        });

        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.findOneWithPolicyCountById.mockResolvedValue(null);

            await expect(
                service.getUpdatableByActor(adminActor, 'missing', update)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
        });

        it('throws RoleSelfForbiddenException when the actor updates the role they hold', async () => {
            roleRepository.findOneWithPolicyCountById.mockResolvedValue({
                ...role,
                _count: { policies: 0 },
            });

            await expect(
                service.getUpdatableByActor(
                    { roleId: role.id, roleType: EnumRoleType.admin },
                    role.id,
                    update
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.selfForbidden,
            });
        });

        it('throws RoleRankForbiddenException when an admin updates a superAdmin role', async () => {
            roleRepository.findOneWithPolicyCountById.mockResolvedValue({
                ...superAdminRole,
                _count: { policies: 0 },
            });

            await expect(
                service.getUpdatableByActor(
                    adminActor,
                    superAdminRole.id,
                    update
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
        });

        it('throws RoleRankForbiddenException when an admin updates an admin role', async () => {
            roleRepository.findOneWithPolicyCountById.mockResolvedValue({
                ...role,
                _count: { policies: 0 },
            });

            await expect(
                service.getUpdatableByActor(adminActor, role.id, update)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
        });

        it('throws RoleRankForbiddenException when an admin raises a user role to admin', async () => {
            roleRepository.findOneWithPolicyCountById.mockResolvedValue({
                ...role,
                type: EnumRoleType.user,
                _count: { policies: 0 },
            });

            await expect(
                service.getUpdatableByActor(adminActor, role.id, {
                    description: null,
                    type: EnumRoleType.admin,
                })
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
        });

        it('throws RoleImmutableException when the type of an immutable role changes', async () => {
            roleRepository.findOneWithPolicyCountById.mockResolvedValue({
                ...immutableRole,
                _count: { policies: 0 },
            });

            await expect(
                service.getUpdatableByActor(
                    superAdminActor,
                    immutableRole.id,
                    update
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.immutable,
            });
        });

        it('returns an immutable role when the type stays', async () => {
            const found = { ...immutableRole, _count: { policies: 0 } };
            roleRepository.findOneWithPolicyCountById.mockResolvedValue(found);

            const result = await service.getUpdatableByActor(
                superAdminActor,
                immutableRole.id,
                { description: 'Team lead role', type: immutableRole.type }
            );

            expect(result).toBe(found);
        });

        it('answers the rank exception ahead of the immutable refusal', async () => {
            roleRepository.findOneWithPolicyCountById.mockResolvedValue({
                ...immutableRole,
                _count: { policies: 0 },
            });

            await expect(
                service.getUpdatableByActor(
                    adminActor,
                    immutableRole.id,
                    update
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
        });
    });

    describe('updateByAdminInTx', () => {
        const update: IRoleUpdate = {
            description: null,
            type: EnumRoleType.user,
        };
        const target = { ...role, _count: { policies: 0 } };

        it('updates the role the read returned', async () => {
            roleRepository.updateInTx.mockResolvedValue(roleWithPolicies);

            const result = await service.updateByAdminInTx(tx, target, update);

            expect(result).toBe(roleWithPolicies);
            expect(roleRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                role.id,
                role.type,
                update
            );
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it("passes the read's type to the guarded write", async () => {
            const userTarget = {
                ...role,
                type: EnumRoleType.user,
                _count: { policies: 0 },
            };
            roleRepository.updateInTx.mockResolvedValue(roleWithPolicies);

            await service.updateByAdminInTx(tx, userTarget, {
                description: null,
                type: EnumRoleType.admin,
            });

            expect(roleRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                role.id,
                EnumRoleType.user,
                { description: null, type: EnumRoleType.admin }
            );
        });

        it('passes the exception the guarded write rejects with', async () => {
            const failure = new RoleNotFoundException();
            roleRepository.updateInTx.mockRejectedValue(failure);

            await expect(
                service.updateByAdminInTx(tx, target, update)
            ).rejects.toBe(failure);
        });
    });

    describe('getDeletableByActor', () => {
        it('returns the role read on the client', async () => {
            roleRepository.findOneById.mockResolvedValue(role);

            const result = await service.getDeletableByActor(
                superAdminActor,
                role.id
            );

            expect(result).toBe(role);
            expect(roleRepository.findOneById).toHaveBeenCalledWith(role.id);
        });

        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.getDeletableByActor(adminActor, 'missing')
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
        });

        it('throws RoleSelfForbiddenException when the actor deletes the role they hold', async () => {
            roleRepository.findOneById.mockResolvedValue(role);

            await expect(
                service.getDeletableByActor(
                    { roleId: role.id, roleType: EnumRoleType.superAdmin },
                    role.id
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.selfForbidden,
            });
        });

        it('throws RoleRankForbiddenException when an admin deletes a superAdmin role', async () => {
            roleRepository.findOneById.mockResolvedValue(superAdminRole);

            await expect(
                service.getDeletableByActor(adminActor, superAdminRole.id)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
        });

        it('throws RoleImmutableException for an immutable role', async () => {
            roleRepository.findOneById.mockResolvedValue(immutableRole);

            await expect(
                service.getDeletableByActor(superAdminActor, immutableRole.id)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.immutable,
            });
        });
    });

    describe('deleteByAdminInTx', () => {
        it('deletes the unused role in one guarded statement and returns the deleted row', async () => {
            const deleted = { ...role, name: 'deleted' };
            roleRepository.deleteUnusedInTx.mockResolvedValue(deleted);

            const result = await service.deleteByAdminInTx(tx, role);

            expect(result).toBe(deleted);
            expect(roleRepository.deleteUnusedInTx).toHaveBeenCalledWith(
                tx,
                role.id
            );
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('passes the exception the guarded delete rejects with', async () => {
            const failure = new RoleUsedException();
            roleRepository.deleteUnusedInTx.mockRejectedValue(failure);

            await expect(service.deleteByAdminInTx(tx, role)).rejects.toBe(
                failure
            );
        });
    });

    describe('getWritableByActor', () => {
        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.getWritableByActor('missing', adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
        });

        it('throws RoleSelfForbiddenException when the actor holds the role', async () => {
            roleRepository.findOneById.mockResolvedValue(role);

            await expect(
                service.getWritableByActor(role.id, {
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
                service.getWritableByActor(superAdminRole.id, adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
        });

        it('returns the role when the actor outranks a role it does not hold', async () => {
            roleRepository.findOneById.mockResolvedValue(role);

            const result = await service.getWritableByActor(
                role.id,
                superAdminActor
            );

            expect(result).toBe(role);
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
