import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Policy, Role } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleScopeMismatchException } from '@modules/role/exceptions/role.scope-mismatch.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleUtil } from '@modules/role/utils/role.util';

describe('RoleDomain', () => {
    const roleRepository: MockProxy<RoleRepository> = mock<RoleRepository>();
    const roleUtil: MockProxy<RoleUtil> = mock<RoleUtil>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const policy = {
        id: 'policy-id',
        roleId: 'role-id',
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
        conditions: null,
        inverted: false,
        reason: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies Policy;
    const role = {
        id: 'role-id',
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.admin,
        name: 'Admin',
        description: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies Role;
    const roleShort = { ...role } satisfies IRole;

    let service: RoleDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(now);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RoleDomain,
                { provide: RoleRepository, useValue: roleRepository },
                { provide: RoleUtil, useValue: roleUtil },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = moduleRef.get(RoleDomain);
    });

    describe('getListOffsetByAdmin / getListCursorBySystem', () => {
        it('passes the pagination and the scope filter through to the repository', async () => {
            const pagination = { page: 1, perPage: 10 } as never;
            const filter = {
                scope: { in: [EnumRoleScope.workspace] },
            } as never;
            const result = { data: [], pagination: {} } as never;
            roleRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                result
            );
            roleRepository.findWithPaginationCursorBySystem.mockResolvedValue(
                result
            );

            await expect(
                service.getListOffsetByAdmin(pagination, filter)
            ).resolves.toBe(result);
            await expect(
                service.getListCursorBySystem(pagination, filter)
            ).resolves.toBe(result);
            expect(
                roleRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination, filter);
            expect(
                roleRepository.findWithPaginationCursorBySystem
            ).toHaveBeenCalledWith(pagination, filter);
        });
    });

    describe('getListOffsetByShared', () => {
        it('passes the pagination and the scope filter through to the repository', async () => {
            const pagination = { limit: 20 } as never;
            const filter = { scope: EnumRoleScope.project } as never;
            const result = { data: [], pagination: {} } as never;
            roleRepository.findWithPaginationOffsetByShared.mockResolvedValue(
                result
            );

            await expect(
                service.getListOffsetByShared(pagination, filter)
            ).resolves.toBe(result);
            expect(
                roleRepository.findWithPaginationOffsetByShared
            ).toHaveBeenCalledWith(pagination, filter);
        });
    });

    describe('getById', () => {
        it('delegates the identity read', async () => {
            roleRepository.findOneById.mockResolvedValue(roleShort);

            await expect(service.getById(role.id)).resolves.toBe(roleShort);
        });
    });

    describe('getOne', () => {
        it('throws RoleNotFoundException when the id is unknown', async () => {
            roleRepository.findOneWithPoliciesById.mockResolvedValue(null);

            await expect(service.getOne('missing')).rejects.toThrow(
                RoleNotFoundException
            );
        });

        it('returns the role with its policies', async () => {
            const withPolicies = { ...role, policies: [policy] };
            roleRepository.findOneWithPoliciesById.mockResolvedValue(
                withPolicies
            );

            await expect(service.getOne(role.id)).resolves.toBe(withPolicies);
        });
    });

    describe('getByIds', () => {
        it('returns the roles matching the given ids', async () => {
            roleRepository.findManyByIds.mockResolvedValue([roleShort]);

            await expect(service.getByIds([role.id])).resolves.toEqual([
                roleShort,
            ]);
            expect(roleRepository.findManyByIds).toHaveBeenCalledWith([
                role.id,
            ]);
        });
    });

    describe('getByScopeAndKey', () => {
        it('returns the catalog row for the scope and key', async () => {
            roleRepository.findOneByScopeAndKey.mockResolvedValue(roleShort);

            await expect(
                service.getByScopeAndKey(
                    EnumRoleScope.platform,
                    EnumRolePlatformKey.admin
                )
            ).resolves.toBe(roleShort);
            expect(roleRepository.findOneByScopeAndKey).toHaveBeenCalledWith(
                EnumRoleScope.platform,
                EnumRolePlatformKey.admin
            );
        });

        it('returns null when the catalog has no such row', async () => {
            roleRepository.findOneByScopeAndKey.mockResolvedValue(null);

            await expect(
                service.getByScopeAndKey(
                    EnumRoleScope.platform,
                    EnumRolePlatformKey.admin
                )
            ).resolves.toBeNull();
        });
    });

    describe('getByScopeAndKeyInTx', () => {
        it('forwards the transaction client to the repository read', async () => {
            roleRepository.findOneByScopeAndKeyInTx.mockResolvedValue(
                roleShort
            );

            await expect(
                service.getByScopeAndKeyInTx(
                    tx,
                    EnumRoleScope.workspace,
                    EnumRoleWorkspaceKey.owner
                )
            ).resolves.toBe(roleShort);
            expect(
                roleRepository.findOneByScopeAndKeyInTx
            ).toHaveBeenCalledWith(
                tx,
                EnumRoleScope.workspace,
                EnumRoleWorkspaceKey.owner
            );
        });
    });

    describe('resolve', () => {
        it('throws RoleNotFoundException when the id is unknown', async () => {
            roleRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.resolve('missing', EnumRoleScope.platform)
            ).rejects.toMatchObject({
                statusCode: EnumRoleStatusCodeError.notFound,
                messagePath: 'role.error.notFound',
            });
        });

        it('throws RoleScopeMismatchException when the scope differs', async () => {
            roleRepository.findOneById.mockResolvedValue(roleShort);

            const call = service.resolve(role.id, EnumRoleScope.workspace);

            await expect(call).rejects.toThrow(RoleScopeMismatchException);
            await expect(call).rejects.toMatchObject({
                statusCode: EnumRoleStatusCodeError.scopeMismatch,
                messagePath: 'role.error.scopeMismatch',
            });
        });

        it('returns the role when the scope matches', async () => {
            roleRepository.findOneById.mockResolvedValue(roleShort);

            await expect(
                service.resolve(role.id, EnumRoleScope.platform)
            ).resolves.toBe(roleShort);
        });
    });

    describe('resolveInTx', () => {
        it('throws RoleNotFoundException when the id is unknown', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(null);

            await expect(
                service.resolveInTx(tx, 'missing', EnumRoleScope.platform)
            ).rejects.toThrow(RoleNotFoundException);
            expect(roleRepository.findOneByIdInTx).toHaveBeenCalledWith(
                tx,
                'missing'
            );
        });

        it('throws RoleScopeMismatchException when the scope differs', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(roleShort);

            await expect(
                service.resolveInTx(tx, role.id, EnumRoleScope.project)
            ).rejects.toThrow(RoleScopeMismatchException);
        });

        it('returns the role when the scope matches', async () => {
            roleRepository.findOneByIdInTx.mockResolvedValue(roleShort);

            await expect(
                service.resolveInTx(tx, role.id, EnumRoleScope.platform)
            ).resolves.toBe(roleShort);
        });
    });

    describe('assertScope', () => {
        it('throws RoleScopeMismatchException when the scope differs', () => {
            try {
                service.assertScope(roleShort, EnumRoleScope.project);
                throw new Error('expected throw');
            } catch (error) {
                expect(error).toBeInstanceOf(RoleScopeMismatchException);
                expect(error).toMatchObject({
                    statusCode: EnumRoleStatusCodeError.scopeMismatch,
                    messagePath: 'role.error.scopeMismatch',
                });
            }
        });

        it('returns without throwing when the scope matches', () => {
            expect(() =>
                service.assertScope(roleShort, EnumRoleScope.platform)
            ).not.toThrow();
        });
    });

    describe('updateByAdmin', () => {
        it('throws RoleNotFoundException when the id is unknown', async () => {
            roleRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.updateByAdmin('missing', { name: 'Editor' })
            ).rejects.toThrow(RoleNotFoundException);
            expect(roleRepository.update).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('writes only name and description and stages the update activity', async () => {
            const data = { name: 'Editor', description: 'Editor role' };
            const updated = { ...role, ...data, policies: [] };
            const metadata = { roleId: role.id } as never;
            const event = { action: EnumActivityLogAction.adminRoleUpdate };
            roleRepository.findOneById.mockResolvedValue(roleShort);
            roleRepository.update.mockResolvedValue(updated);
            roleUtil.mapActivityLogMetadata.mockReturnValue(metadata);
            activityLogDomain.prepare.mockReturnValue(event as never);

            await expect(service.updateByAdmin(role.id, data)).resolves.toBe(
                updated
            );
            expect(roleRepository.update).toHaveBeenCalledWith(role.id, {
                name: data.name,
                description: data.description,
            });
            expect(roleUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                { ...roleShort, name: data.name },
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminRoleUpdate,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });
    });
});
