import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    EnumActivityLogAction,
    EnumRoleType,
} from '@generated/prisma-client/client';
import type { Role } from '@generated/prisma-client/client';
import type { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { RoleHasPoliciesException } from '@modules/role/exceptions/role.has-policies.exception';
import { RoleImmutableException } from '@modules/role/exceptions/role.immutable.exception';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import { RoleSelfForbiddenException } from '@modules/role/exceptions/role.self-forbidden.exception';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type {
    IRoleActor,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { RoleUpdateByAdminUseCase } from '@modules/role/use-cases/role.update-by-admin.use-case';

describe('RoleUpdateByAdminUseCase', () => {
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const role: Role = {
        id: 'role-1',
        name: 'manager',
        description: null,
        type: EnumRoleType.admin,
        isImmutable: false,
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
    };
    const roleWithPolicies: IRoleWithPolicies = { ...role, policies: [] };
    const roleWithPolicyCount: IRoleWithPolicyCount = {
        ...role,
        _count: { policies: 0 },
    };
    const actorRole: IRoleWithPolicies = {
        ...roleWithPolicies,
        id: 'role-actor',
        type: EnumRoleType.superAdmin,
    };
    const actorUser: IUser = {
        ...buildUser('user-actor', 'actor@example.com'),
        roleId: actorRole.id,
        role: actorRole,
    };
    const actor: IRoleActor = {
        roleId: actorRole.id,
        roleType: EnumRoleType.superAdmin,
    };
    const metadata = {
        roleId: role.id,
        roleName: role.name,
        roleType: role.type,
        timestamp: now,
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(actorUser);
    const authContext = buildAuthJwtAccessContext(actorUser.id);
    const effect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    let useCase: RoleUpdateByAdminUseCase;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        activityLogQueue.recordEffect.mockReturnValue(effect);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleUpdateByAdminUseCase,
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                RoleUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(RoleUpdateByAdminUseCase);
    });

    describe('execute', () => {
        const body: RoleUpdateRequestDto = {
            description: 'Team lead role',
            type: EnumRoleType.user,
        };

        beforeEach(() => {
            roleService.getUpdatableByActor.mockResolvedValue(
                roleWithPolicyCount
            );
        });

        it.each([
            ['RoleNotFoundException', new RoleNotFoundException()],
            ['RoleSelfForbiddenException', new RoleSelfForbiddenException()],
            ['RoleRankForbiddenException', new RoleRankForbiddenException()],
            ['RoleImmutableException', new RoleImmutableException()],
            ['RoleHasPoliciesException', new RoleHasPoliciesException()],
        ])(
            'throws %s from getUpdatableByActor and opens no transaction',
            async (_name, failure) => {
                roleService.getUpdatableByActor.mockRejectedValue(failure);

                await expect(
                    useCase.execute(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        userContext,
                        roleWithPolicies.id,
                        body
                    )
                ).rejects.toBe(failure);
                expect(databaseService.withTransaction).not.toHaveBeenCalled();
            }
        );

        it('updates the role on the outbox transaction and wraps the result', async () => {
            roleService.updateByAdminInTx.mockResolvedValue(roleWithPolicies);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                roleWithPolicies.id,
                body
            );

            expect(result).toEqual({ data: roleWithPolicies });
            expect(roleService.getUpdatableByActor).toHaveBeenCalledWith(
                actor,
                roleWithPolicies.id,
                { description: 'Team lead role', type: EnumRoleType.user }
            );
            expect(roleService.updateByAdminInTx).toHaveBeenCalledWith(
                tx,
                roleWithPolicyCount,
                { description: 'Team lead role', type: EnumRoleType.user }
            );
        });

        it('adds the update activity entry from the updated role and the passed context on the same tx', async () => {
            roleService.updateByAdminInTx.mockResolvedValue(roleWithPolicies);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                roleWithPolicies.id,
                body
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                { action: EnumActivityLogAction.adminRoleUpdated, metadata }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('passes a null description through to clear it', async () => {
            roleService.updateByAdminInTx.mockResolvedValue(roleWithPolicies);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                roleWithPolicies.id,
                {
                    description: null,
                    type: EnumRoleType.user,
                }
            );

            expect(roleService.updateByAdminInTx).toHaveBeenCalledWith(
                tx,
                roleWithPolicyCount,
                { description: null, type: EnumRoleType.user }
            );
        });

        it('passes a rejected exception of the write through untouched', async () => {
            const failure = new RoleNotFoundException();
            roleService.updateByAdminInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    roleWithPolicies.id,
                    body
                )
            ).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('passes any other rejection through untouched', async () => {
            const cause = new Error('boom');
            roleService.updateByAdminInTx.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    roleWithPolicies.id,
                    body
                )
            ).rejects.toBe(cause);
        });
    });
});
