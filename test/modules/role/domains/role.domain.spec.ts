import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Policy, Role } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type {
    IActivityLogMetadata,
    IActivityLogStagedEvent,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';
import { RoleExistException } from '@modules/role/exceptions/role.exist.exception';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RolePredefinedException } from '@modules/role/exceptions/role.predefined.exception';
import { RoleScopeMismatchException } from '@modules/role/exceptions/role.scope-mismatch.exception';
import { RoleUsedException } from '@modules/role/exceptions/role.used.exception';
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
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
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
                { provide: DatabaseUtil, useValue: databaseUtil },
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
            ).toHaveBeenCalledWith(pagination, filter, undefined);
            expect(
                roleRepository.findWithPaginationCursorBySystem
            ).toHaveBeenCalledWith(pagination, filter);
        });

        it('forwards the accessible where as the trailing repository argument of the admin offset list', async () => {
            const pagination = { limit: 20 } as never;
            const accessibleWhere = { scope: EnumRoleScope.workspace };
            const result = { data: [], pagination: {} } as never;
            roleRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                result
            );

            await expect(
                service.getListOffsetByAdmin(
                    pagination,
                    undefined,
                    accessibleWhere
                )
            ).resolves.toBe(result);
            expect(
                roleRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination, undefined, accessibleWhere);
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
    describe('createByAdmin', () => {
        const body = {
            scope: EnumRoleScope.platform,
            key: 'platform.editor',
            name: 'Platform Editor',
            description: undefined,
        };
        const metadata: IActivityLogMetadata = { roleId: 'new-id' };
        const event: IActivityLogStagedEvent = {
            action: EnumActivityLogAction.adminRoleCreate,
            metadata,
            onError: false,
        };
        const created = {
            ...role,
            id: 'new-id',
            key: 'platform.editor',
            name: 'Platform Editor',
            policies: [],
        };

        it('throws RoleExistException when the scope and key already exist', async () => {
            roleRepository.existsByScopeAndKey.mockResolvedValue(true);

            const call = service.createByAdmin(body);

            await expect(call).rejects.toThrow(RoleExistException);
            await expect(call).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.exist,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.exist],
                messagePath: 'role.error.exist',
            });
            expect(roleRepository.create).not.toHaveBeenCalled();
            expect(activityLogDomain.prepare).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('prepares the activity before the insert, creates with the given key and name, then stages', async () => {
            const callOrder: string[] = [];
            roleRepository.existsByScopeAndKey.mockResolvedValue(false);
            databaseUtil.createId.mockReturnValue('new-id');
            roleUtil.mapActivityLogMetadata.mockReturnValue(metadata);
            activityLogDomain.prepare.mockImplementation(() => {
                callOrder.push('prepare');
                return event;
            });
            roleRepository.create.mockImplementation(async () => {
                callOrder.push('create');
                return created;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            await expect(service.createByAdmin(body)).resolves.toBe(created);
            expect(roleRepository.existsByScopeAndKey).toHaveBeenCalledWith(
                EnumRoleScope.platform,
                'platform.editor'
            );
            expect(roleUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                {
                    id: 'new-id',
                    scope: EnumRoleScope.platform,
                    key: 'platform.editor',
                    name: 'Platform Editor',
                },
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminRoleCreate,
                metadata,
            });
            expect(roleRepository.create).toHaveBeenCalledWith({
                id: 'new-id',
                scope: EnumRoleScope.platform,
                key: 'platform.editor',
                name: 'Platform Editor',
                description: null,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(callOrder).toEqual(['prepare', 'create', 'stage']);
        });

        it('passes the description through when given', async () => {
            roleRepository.existsByScopeAndKey.mockResolvedValue(false);
            databaseUtil.createId.mockReturnValue('new-id');
            roleRepository.create.mockResolvedValue(created);

            await service.createByAdmin({
                ...body,
                description: 'Edits content',
            });

            expect(roleRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ description: 'Edits content' })
            );
        });
    });

    describe('deleteByAdmin', () => {
        const custom = {
            id: 'custom-id',
            scope: EnumRoleScope.workspace,
            key: 'editor',
            name: 'editor',
        } satisfies IRole;
        const metadata: IActivityLogMetadata = { roleId: custom.id };
        const event: IActivityLogStagedEvent = {
            action: EnumActivityLogAction.adminRoleDelete,
            metadata,
            onError: false,
        };

        it('issues the role read and the usage read together', async () => {
            let resolveRole: (value: IRole | null) => void = () => {};
            roleRepository.findOneById.mockReturnValue(
                new Promise(resolve => {
                    resolveRole = resolve;
                })
            );
            roleRepository.isUsedById.mockResolvedValue(false);

            const call = service.deleteByAdmin(custom.id);

            expect(roleRepository.findOneById).toHaveBeenCalledWith(custom.id);
            expect(roleRepository.isUsedById).toHaveBeenCalledWith(custom.id);

            resolveRole(custom);
            await expect(call).resolves.toBeUndefined();
        });

        it('throws RoleNotFoundException when the id is unknown, even if the usage read answers true', async () => {
            roleRepository.findOneById.mockResolvedValue(null);
            roleRepository.isUsedById.mockResolvedValue(true);

            const call = service.deleteByAdmin('missing');

            await expect(call).rejects.toThrow(RoleNotFoundException);
            await expect(call).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                messagePath: 'role.error.notFound',
            });
            expect(roleRepository.delete).not.toHaveBeenCalled();
            expect(activityLogDomain.prepare).not.toHaveBeenCalled();
        });

        it.each([
            [EnumRoleScope.platform, EnumRolePlatformKey.superAdmin],
            [EnumRoleScope.workspace, EnumRoleWorkspaceKey.owner],
            [EnumRoleScope.project, EnumRoleProjectKey.viewer],
        ])(
            'throws RolePredefinedException for the %s catalog role %s, even when it is in use',
            async (scope, key) => {
                roleRepository.findOneById.mockResolvedValue({
                    ...custom,
                    scope,
                    key,
                });
                roleRepository.isUsedById.mockResolvedValue(true);

                const call = service.deleteByAdmin(custom.id);

                await expect(call).rejects.toThrow(RolePredefinedException);
                await expect(call).rejects.toMatchObject({
                    module: 'role',
                    statusCode: EnumRoleStatusCodeError.predefined,
                    statusCodeKey:
                        EnumRoleStatusCodeError[
                            EnumRoleStatusCodeError.predefined
                        ],
                    messagePath: 'role.error.predefined',
                });
                expect(roleRepository.delete).not.toHaveBeenCalled();
            }
        );

        it('treats a key that is catalog only in another scope as a custom role', async () => {
            roleRepository.findOneById.mockResolvedValue({
                ...custom,
                scope: EnumRoleScope.project,
                key: EnumRoleWorkspaceKey.owner,
            });
            roleRepository.isUsedById.mockResolvedValue(false);

            await expect(
                service.deleteByAdmin(custom.id)
            ).resolves.toBeUndefined();
            expect(roleRepository.isUsedById).toHaveBeenCalledWith(custom.id);
        });

        it('throws RoleUsedException when the role is still referenced', async () => {
            roleRepository.findOneById.mockResolvedValue(custom);
            roleRepository.isUsedById.mockResolvedValue(true);

            const call = service.deleteByAdmin(custom.id);

            await expect(call).rejects.toThrow(RoleUsedException);
            await expect(call).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.used,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.used],
                messagePath: 'role.error.used',
            });
            expect(roleRepository.delete).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('prepares the activity before the delete, deletes, then stages', async () => {
            const callOrder: string[] = [];
            roleRepository.findOneById.mockResolvedValue(custom);
            roleRepository.isUsedById.mockResolvedValue(false);
            roleUtil.mapActivityLogMetadata.mockReturnValue(metadata);
            activityLogDomain.prepare.mockImplementation(() => {
                callOrder.push('prepare');
                return event;
            });
            roleRepository.delete.mockImplementation(async () => {
                callOrder.push('delete');
                return { ...role, ...custom, description: null } satisfies Role;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stage');
            });

            await expect(
                service.deleteByAdmin(custom.id)
            ).resolves.toBeUndefined();
            expect(roleUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                custom,
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminRoleDelete,
                metadata,
            });
            expect(roleRepository.delete).toHaveBeenCalledWith(custom.id);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(callOrder).toEqual(['prepare', 'delete', 'stage']);
        });
    });
});
