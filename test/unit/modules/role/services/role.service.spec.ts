import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumRoleScope } from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
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
    IRoleRef,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleService } from '@modules/role/services/role.service';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';

describe('RoleService', () => {
    const roleRepository: MockProxy<RoleRepository> = mock<RoleRepository>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();
    const where: Prisma.RoleWhereInput = { scope: EnumRoleScope.platform };

    let service: RoleService;

    const baseRole: IRole = {
        id: 'role-1',
        scope: EnumRoleScope.platform,
        key: 'custom',
        name: 'Custom',
        description: null,
        policyRevision: 0,
        isImmutable: false,
    };
    const baseRoleWithPolicies: IRoleWithPolicies = {
        ...baseRole,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        policies: [],
    };
    const ref: IRoleRef = {
        id: 'role-1',
        scope: EnumRoleScope.workspace,
        key: 'owner',
        name: 'Owner',
        policyRevision: 0,
    };
    const offsetParams: IPaginationQueryOffsetParams = {
        orderBy: [],
        limit: 10,
        skip: 0,
    };
    const cursorParams: IPaginationQueryCursorParams = {
        orderBy: [],
        limit: 10,
        fingerprint: 'fingerprint-1',
    };
    const offsetPage: IResponsePaginationReturn<IRoleWithPolicyCount> = {
        type: EnumPaginationType.offset,
        count: 0,
        perPage: 10,
        hasNext: false,
        hasPrevious: false,
        page: 1,
        totalPage: 0,
        data: [],
    };
    const cursorPage: IResponsePaginationReturn<IRoleWithPolicyCount> = {
        type: EnumPaginationType.cursor,
        perPage: 10,
        hasNext: false,
        data: [],
    };
    const admin: IRoleActor = {
        roleId: 'role-admin',
        roleKey: EnumRolePlatformKey.admin,
    };
    const superAdmin: IRoleActor = {
        roleId: 'role-super',
        roleKey: EnumRolePlatformKey.superAdmin,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleService,
                { provide: RoleRepository, useValue: roleRepository },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        service = module.get(RoleService);
    });

    describe('getListOffsetByAdmin', () => {
        it('forwards the admin list with the scope filter and the predicate', async () => {
            roleRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                offsetPage
            );

            const result = await service.getListOffsetByAdmin(
                offsetParams,
                null,
                where
            );

            expect(result).toBe(offsetPage);
            expect(
                roleRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(offsetParams, null, where);
        });
    });

    describe('getListCursorByShared', () => {
        it('forwards the shared catalog cursor list with its scope', async () => {
            roleRepository.findWithPaginationCursorByShared.mockResolvedValue(
                cursorPage
            );

            const result = await service.getListCursorByShared(
                cursorParams,
                EnumRoleScope.workspace
            );

            expect(result).toBe(cursorPage);
            expect(
                roleRepository.findWithPaginationCursorByShared
            ).toHaveBeenCalledWith(cursorParams, EnumRoleScope.workspace);
        });
    });

    describe('getListCursorBySystem', () => {
        it('forwards the system cursor list with the scope filter', async () => {
            roleRepository.findWithPaginationCursorBySystem.mockResolvedValue(
                cursorPage
            );

            const result = await service.getListCursorBySystem(
                cursorParams,
                null
            );

            expect(result).toBe(cursorPage);
            expect(
                roleRepository.findWithPaginationCursorBySystem
            ).toHaveBeenCalledWith(cursorParams, null);
        });
    });

    describe('assertExistsById', () => {
        it('passes when the role is reachable', async () => {
            roleRepository.existsById.mockResolvedValue(true);

            await expect(
                service.assertExistsById('role-1', where)
            ).resolves.toBeUndefined();
            expect(roleRepository.existsById).toHaveBeenCalledWith(
                'role-1',
                where
            );
        });

        it('throws not found when it is not', async () => {
            roleRepository.existsById.mockResolvedValue(false);

            await expect(
                service.assertExistsById('role-1', where)
            ).rejects.toThrow(RoleNotFoundException);
        });
    });

    describe('getOneWithPolicies', () => {
        it('returns the role inside the predicate', async () => {
            const found = baseRoleWithPolicies;
            roleRepository.findOneWithPoliciesById.mockResolvedValue(found);

            const result = await service.getOneWithPolicies('role-1', where);

            expect(result).toBe(found);
            expect(roleRepository.findOneWithPoliciesById).toHaveBeenCalledWith(
                'role-1',
                where
            );
        });

        it('throws not found when the predicate excludes it', async () => {
            roleRepository.findOneWithPoliciesById.mockResolvedValue(null);

            await expect(
                service.getOneWithPolicies('role-1', where)
            ).rejects.toThrow(RoleNotFoundException);
        });
    });

    describe('getWritableByActor', () => {
        it('returns a role the actor outranks and does not hold', async () => {
            const found = { ...baseRole, key: 'custom' };
            roleRepository.findOneById.mockResolvedValue(found);

            const result = await service.getWritableByActor(
                'role-1',
                admin,
                where
            );

            expect(result).toBe(found);
            expect(roleRepository.findOneById).toHaveBeenCalledWith(
                'role-1',
                where
            );
        });

        it('throws not found when the role is unreachable', async () => {
            roleRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.getWritableByActor('role-1', admin, where)
            ).rejects.toThrow(RoleNotFoundException);
        });

        it('refuses the role the actor holds', async () => {
            roleRepository.findOneById.mockResolvedValue({
                ...baseRole,
                id: 'role-admin',
                key: EnumRolePlatformKey.admin,
            });

            await expect(
                service.getWritableByActor('role-admin', admin, where)
            ).rejects.toThrow(RoleSelfForbiddenException);
        });

        it('refuses a platform role ranked at or above the actor', async () => {
            roleRepository.findOneById.mockResolvedValue({
                ...baseRole,
                id: 'role-2',
                key: EnumRolePlatformKey.admin,
            });

            await expect(
                service.getWritableByActor('role-2', admin, where)
            ).rejects.toThrow(RoleRankForbiddenException);
        });

        it('lets a superAdmin write a platform role of any rank', async () => {
            roleRepository.findOneById.mockResolvedValue({
                ...baseRole,
                id: 'role-2',
                key: EnumRolePlatformKey.superAdmin,
            });

            await expect(
                service.getWritableByActor('role-2', superAdmin, where)
            ).resolves.toMatchObject({ id: 'role-2' });
        });

        it('never ranks a workspace role, whatever its key', async () => {
            roleRepository.findOneById.mockResolvedValue({
                ...baseRole,
                id: 'role-2',
                scope: EnumRoleScope.workspace,
                key: EnumRolePlatformKey.superAdmin,
            });

            await expect(
                service.getWritableByActor('role-2', admin, where)
            ).resolves.toMatchObject({ id: 'role-2' });
        });

        it('ranks a custom platform role with user', async () => {
            roleRepository.findOneById.mockResolvedValue({
                ...baseRole,
                id: 'role-2',
                key: 'auditor',
            });
            const user: IRoleActor = {
                roleId: 'role-user',
                roleKey: EnumRolePlatformKey.user,
            };

            await expect(
                service.getWritableByActor('role-2', user, where)
            ).rejects.toThrow(RoleRankForbiddenException);
        });
    });

    describe('getByIdInTx', () => {
        it('returns the role read on the transaction', async () => {
            const found = baseRole;
            roleRepository.findOneByIdInTx.mockResolvedValue(found);

            const result = await service.getByIdInTx(tx, 'role-1', where);

            expect(result).toBe(found);
            expect(roleRepository.findOneByIdInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                where
            );
        });

        it('throws not found when no row matches', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(null);

            await expect(
                service.getByIdInTx(tx, 'role-1', where)
            ).rejects.toThrow(RoleNotFoundException);
        });
    });

    describe('getRefByScopeAndKey', () => {
        it('resolves a role by scope and key', async () => {
            roleRepository.findOneRefByScopeAndKey.mockResolvedValue(ref);

            const result = await service.getRefByScopeAndKey(
                EnumRoleScope.workspace,
                'owner'
            );

            expect(result).toBe(ref);
        });

        it('throws not found for an unknown scope and key', async () => {
            roleRepository.findOneRefByScopeAndKey.mockResolvedValue(null);

            await expect(
                service.getRefByScopeAndKey(EnumRoleScope.workspace, 'nobody')
            ).rejects.toThrow(RoleNotFoundException);
        });
    });

    describe('getRefByScopeAndKeyInTx', () => {
        it('resolves a role by scope and key inside the transaction', async () => {
            roleRepository.findOneRefByScopeAndKeyInTx.mockResolvedValue(ref);

            const result = await service.getRefByScopeAndKeyInTx(
                tx,
                EnumRoleScope.workspace,
                'owner'
            );

            expect(result).toBe(ref);
            expect(
                roleRepository.findOneRefByScopeAndKeyInTx
            ).toHaveBeenCalledWith(tx, EnumRoleScope.workspace, 'owner');
        });

        it('throws not found for an unknown scope and key inside the transaction', async () => {
            roleRepository.findOneRefByScopeAndKeyInTx.mockResolvedValue(null);

            await expect(
                service.getRefByScopeAndKeyInTx(
                    tx,
                    EnumRoleScope.workspace,
                    'nobody'
                )
            ).rejects.toThrow(RoleNotFoundException);
        });
    });

    describe('getRefByIdForScope', () => {
        it('resolves a role by id for the scope the assignment needs', async () => {
            roleRepository.findOneRefById.mockResolvedValue(ref);

            const result = await service.getRefByIdForScope(
                'role-1',
                EnumRoleScope.workspace
            );

            expect(result).toBe(ref);
        });

        it('throws not found when the id names no role', async () => {
            roleRepository.findOneRefById.mockResolvedValue(null);

            await expect(
                service.getRefByIdForScope('role-1', EnumRoleScope.workspace)
            ).rejects.toThrow(RoleNotFoundException);
        });

        it('throws scope mismatch when the role has another scope', async () => {
            roleRepository.findOneRefById.mockResolvedValue(ref);

            await expect(
                service.getRefByIdForScope('role-1', EnumRoleScope.platform)
            ).rejects.toThrow(RoleScopeMismatchException);
        });
    });

    describe('assertScope', () => {
        it('passes for the same scope and throws for another', () => {
            const projectRef: IRoleRef = {
                id: 'role-1',
                scope: EnumRoleScope.project,
                key: 'viewer',
                name: 'Viewer',
                policyRevision: 0,
            };

            expect(() =>
                service.assertScope(projectRef, EnumRoleScope.project)
            ).not.toThrow();
            expect(() =>
                service.assertScope(projectRef, EnumRoleScope.workspace)
            ).toThrow(RoleScopeMismatchException);
        });
    });

    describe('getOneByUserId', () => {
        it('returns the role of the user', async () => {
            const found = baseRole;
            roleRepository.findOneByUserId.mockResolvedValue(found);

            await expect(
                service.getOneByUserId('user-1', { id: 'scoped' })
            ).resolves.toBe(found);
            expect(roleRepository.findOneByUserId).toHaveBeenCalledWith(
                'user-1',
                { id: 'scoped' }
            );
        });

        it('throws user not found when the user holds no role row', async () => {
            roleRepository.findOneByUserId.mockResolvedValue(null);

            await expect(
                service.getOneByUserId('user-1', null)
            ).rejects.toThrow(UserNotFoundException);
        });
    });

    describe('createByAdminInTx', () => {
        const data = {
            scope: EnumRoleScope.platform,
            key: 'auditor',
            name: 'Auditor',
            description: null,
        };

        it('creates a role the actor outranks', async () => {
            const created = { ...baseRoleWithPolicies, key: 'auditor' };
            roleRepository.createInTx.mockResolvedValue(created);

            const result = await service.createByAdminInTx(
                tx,
                'role-9',
                data,
                admin
            );

            expect(result).toBe(created);
            expect(roleRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'role-9',
                data
            );
        });

        it('refuses a platform role ranked at or above the actor', async () => {
            await expect(
                service.createByAdminInTx(
                    tx,
                    'role-9',
                    { ...data, key: EnumRolePlatformKey.admin },
                    admin
                )
            ).rejects.toThrow(RoleRankForbiddenException);
            expect(roleRepository.createInTx).not.toHaveBeenCalled();
        });

        it('maps a key collision to the exist exception', async () => {
            const failure = new Error('unique');
            roleRepository.createInTx.mockRejectedValue(failure);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                service.createByAdminInTx(tx, 'role-9', data, admin)
            ).rejects.toThrow(RoleExistException);
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                failure,
                'key'
            );
        });

        it('wraps any other failure as unknown', async () => {
            roleRepository.createInTx.mockRejectedValue(new Error('boom'));
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                service.createByAdminInTx(tx, 'role-9', data, admin)
            ).rejects.toThrow(AppUnknownException);
        });
    });

    describe('updateByAdminInTx', () => {
        const data = { name: 'Renamed', description: null };

        it('updates a role the actor outranks inside the predicate', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(baseRole);
            const updated = { ...baseRoleWithPolicies, name: 'Renamed' };
            roleRepository.updateInTx.mockResolvedValue(updated);

            const result = await service.updateByAdminInTx(
                tx,
                'role-1',
                data,
                admin,
                where
            );

            expect(result).toBe(updated);
            expect(roleRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                data,
                where
            );
        });

        it('refuses the role the actor holds, and one it does not outrank', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue({
                ...baseRole,
                id: 'role-admin',
            });
            await expect(
                service.updateByAdminInTx(tx, 'role-admin', data, admin, where)
            ).rejects.toThrow(RoleSelfForbiddenException);

            roleRepository.findOneByIdInTx.mockResolvedValue({
                ...baseRole,
                key: EnumRolePlatformKey.admin,
            });
            await expect(
                service.updateByAdminInTx(tx, 'role-1', data, admin, where)
            ).rejects.toThrow(RoleRankForbiddenException);
        });

        it('throws not found when the scoped update matches no row', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(baseRole);
            roleRepository.updateInTx.mockResolvedValue(null);

            await expect(
                service.updateByAdminInTx(tx, 'role-1', data, admin, where)
            ).rejects.toThrow(RoleNotFoundException);
        });
    });

    describe('deleteByAdminInTx', () => {
        it('deletes an unused, mutable role the actor outranks', async () => {
            const found = baseRole;
            roleRepository.findOneByIdInTx.mockResolvedValue(found);
            roleRepository.deleteUnusedInTx.mockResolvedValue(true);

            const result = await service.deleteByAdminInTx(
                tx,
                'role-1',
                admin,
                where
            );

            expect(result).toBe(found);
            expect(roleRepository.deleteUnusedInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                where
            );
        });

        it('refuses an immutable role before deleting', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue({
                ...baseRole,
                isImmutable: true,
            });

            await expect(
                service.deleteByAdminInTx(tx, 'role-1', admin, where)
            ).rejects.toThrow(RoleImmutableException);
            expect(roleRepository.deleteUnusedInTx).not.toHaveBeenCalled();
        });

        it('refuses the role the actor holds, and one it does not outrank', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue({
                ...baseRole,
                id: 'role-admin',
            });
            await expect(
                service.deleteByAdminInTx(tx, 'role-admin', admin, where)
            ).rejects.toThrow(RoleSelfForbiddenException);

            roleRepository.findOneByIdInTx.mockResolvedValue({
                ...baseRole,
                key: EnumRolePlatformKey.admin,
            });
            await expect(
                service.deleteByAdminInTx(tx, 'role-1', admin, where)
            ).rejects.toThrow(RoleRankForbiddenException);
        });

        it('throws used when something still references the role', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(baseRole);
            roleRepository.deleteUnusedInTx.mockResolvedValue(false);

            await expect(
                service.deleteByAdminInTx(tx, 'role-1', admin, where)
            ).rejects.toThrow(RoleUsedException);
        });
    });

    describe('bumpPolicyRevisionInTx', () => {
        it('increments the revision on the transaction', async () => {
            roleRepository.incrementPolicyRevisionInTx.mockResolvedValue(true);

            await service.bumpPolicyRevisionInTx(tx, 'role-1');

            expect(
                roleRepository.incrementPolicyRevisionInTx
            ).toHaveBeenCalledWith(tx, 'role-1');
        });

        it('throws not found when the role row is gone', async () => {
            roleRepository.incrementPolicyRevisionInTx.mockResolvedValue(false);

            await expect(
                service.bumpPolicyRevisionInTx(tx, 'role-1')
            ).rejects.toThrow(RoleNotFoundException);
        });
    });
});
