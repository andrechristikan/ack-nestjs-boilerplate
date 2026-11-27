import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { RoleService } from '@modules/role/services/role.service';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { PolicyDeleteByAdminUseCase } from '@modules/policy/use-cases/policy.delete-by-admin.use-case';

describe('PolicyDeleteByAdminUseCase', () => {
    const policyService: MockProxy<PolicyService> = mock<PolicyService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    const policy: Policy = {
        id: 'policy-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        roleId: 'role-1',
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.manage],
    };

    const deletedPolicy: Policy = {
        ...policy,
        subject: EnumPolicySubject.role,
    };

    const baseUser: IUser = buildUser('user-1', 'andre@example.com');

    const policyMetadata: IActivityLogMetadata = {
        roleId: 'role-1',
        subject: EnumPolicySubject.role,
        action: EnumPolicyAction.manage,
    };
    const actor: IUser = {
        ...baseUser,
        roleId: 'role-actor',
        role: { ...baseUser.role, id: 'role-actor' },
    };

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(actor);
    const authContext = buildAuthJwtAccessContext(actor.id);
    const effect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    const targetRole: IRole = {
        id: 'role-1',
        type: EnumRoleType.admin,
        name: 'Admin',
        isImmutable: false,
    };

    let useCase: PolicyDeleteByAdminUseCase;

    beforeEach(async () => {
        activityLogQueue.recordEffect.mockReturnValue(effect);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyDeleteByAdminUseCase,
                { provide: PolicyService, useValue: policyService },
                { provide: RoleService, useValue: roleService },
                PolicyUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();

        useCase = module.get(PolicyDeleteByAdminUseCase);
    });

    describe('execute', () => {
        it('writes nothing when the role gate rejects, passing the actor role', async () => {
            const failure = new RoleRankForbiddenException();
            roleService.getWritableByActor.mockRejectedValue(failure);

            const promise = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                'policy-1'
            );

            await expect(promise).rejects.toBe(failure);
            expect(roleService.getWritableByActor).toHaveBeenCalledWith(
                'role-1',
                { roleId: actor.roleId, roleType: actor.role.type }
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('reads the policy while the role gate is still pending', async () => {
            const gate = buildDeferred<IRole>();
            roleService.getWritableByActor.mockReturnValue(gate.promise);
            policyService.getOneByRoleAndId.mockResolvedValue(policy);
            policyService.deleteByAdminInTx.mockResolvedValue(deletedPolicy);

            const promise = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                'policy-1'
            );

            expect(policyService.getOneByRoleAndId).toHaveBeenCalledWith(
                'role-1',
                'policy-1'
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();

            gate.resolve(targetRole);
            await promise;
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('throws PolicyNotFoundException from getOneByRoleAndId and opens no transaction', async () => {
            const failure = new PolicyNotFoundException();
            roleService.getWritableByActor.mockResolvedValue(targetRole);
            policyService.getOneByRoleAndId.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'role-1',
                    'policy-1'
                )
            ).rejects.toBe(failure);
            expect(policyService.getOneByRoleAndId).toHaveBeenCalledWith(
                'role-1',
                'policy-1'
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('deletes the policy on the outbox transaction after the role gate and wraps the response', async () => {
            roleService.getWritableByActor.mockResolvedValue(targetRole);
            policyService.getOneByRoleAndId.mockResolvedValue(policy);
            policyService.deleteByAdminInTx.mockResolvedValue(deletedPolicy);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                'policy-1'
            );

            expect(result).toEqual({});
            expect(policyService.deleteByAdminInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                'policy-1'
            );
        });

        it('adds the delete activity entry from the deleted row alone in one addInTx call on the same tx', async () => {
            roleService.getWritableByActor.mockResolvedValue(targetRole);
            policyService.getOneByRoleAndId.mockResolvedValue(policy);
            policyService.deleteByAdminInTx.mockResolvedValue(deletedPolicy);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                'policy-1'
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.adminPolicyDeleted,
                    metadata: policyMetadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('passes a rejected exception of the write through untouched and adds no entry', async () => {
            const failure = new PolicyNotFoundException();
            roleService.getWritableByActor.mockResolvedValue(targetRole);
            policyService.getOneByRoleAndId.mockResolvedValue(policy);
            policyService.deleteByAdminInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'role-1',
                    'policy-1'
                )
            ).rejects.toBe(failure);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('passes any other rejection through untouched', async () => {
            const cause = new Error('boom');
            roleService.getWritableByActor.mockResolvedValue(targetRole);
            policyService.getOneByRoleAndId.mockResolvedValue(policy);
            policyService.deleteByAdminInTx.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'role-1',
                    'policy-1'
                )
            ).rejects.toBe(cause);
        });
    });
});
