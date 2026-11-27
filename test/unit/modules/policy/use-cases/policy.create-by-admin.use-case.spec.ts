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
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { RoleService } from '@modules/role/services/role.service';
import { PolicyRoleTypeInvalidException } from '@modules/policy/exceptions/policy.role-type-invalid.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { PolicyCreateByAdminUseCase } from '@modules/policy/use-cases/policy.create-by-admin.use-case';

describe('PolicyCreateByAdminUseCase', () => {
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

    const baseUser: IUser = buildUser('user-1', 'andre@example.com');

    const policyMetadata: IActivityLogMetadata = {
        roleId: 'role-1',
        subject: EnumPolicySubject.user,
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

    let useCase: PolicyCreateByAdminUseCase;

    beforeEach(async () => {
        activityLogQueue.recordEffect.mockReturnValue(effect);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyCreateByAdminUseCase,
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

        useCase = module.get(PolicyCreateByAdminUseCase);
    });

    describe('execute', () => {
        const body: PolicyRequestDto = {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.manage],
        };

        it('writes nothing when the role gate rejects, passing the actor role', async () => {
            const failure = new RoleRankForbiddenException();
            roleService.getWritableByActor.mockRejectedValue(failure);

            const promise = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                body
            );

            await expect(promise).rejects.toBe(failure);
            expect(roleService.getWritableByActor).toHaveBeenCalledWith(
                'role-1',
                { roleId: actor.roleId, roleType: actor.role.type }
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('writes nothing when the role is user-type', async () => {
            const userRole: IRole = { ...targetRole, type: EnumRoleType.user };
            const failure = new PolicyRoleTypeInvalidException();
            roleService.getWritableByActor.mockResolvedValue(userRole);
            policyService.assertRoleTypeAllowed.mockImplementation(() => {
                throw failure;
            });

            const promise = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                body
            );

            await expect(promise).rejects.toBe(failure);
            expect(policyService.assertRoleTypeAllowed).toHaveBeenCalledWith(
                EnumRoleType.user
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(policyService.createByAdminInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('checks the role type of an admin role before the write', async () => {
            roleService.getWritableByActor.mockResolvedValue(targetRole);
            policyService.createByAdminInTx.mockResolvedValue(policy);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                body
            );

            expect(policyService.assertRoleTypeAllowed).toHaveBeenCalledWith(
                EnumRoleType.admin
            );
        });

        it('creates the policy on the outbox transaction after the role gate and wraps it in the response envelope', async () => {
            roleService.getWritableByActor.mockResolvedValue(targetRole);
            policyService.createByAdminInTx.mockResolvedValue(policy);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                body
            );

            expect(result).toEqual({ data: policy });
            expect(policyService.createByAdminInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                body
            );
        });

        it('adds the create activity entry alone in one addInTx call on the same tx', async () => {
            roleService.getWritableByActor.mockResolvedValue(targetRole);
            policyService.createByAdminInTx.mockResolvedValue(policy);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                body
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.adminPolicyCreated,
                    metadata: policyMetadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('passes a rejected exception of the write through untouched and adds no entry', async () => {
            const failure = new PolicyRoleTypeInvalidException();
            roleService.getWritableByActor.mockResolvedValue(targetRole);
            policyService.createByAdminInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'role-1',
                    body
                )
            ).rejects.toBe(failure);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('passes any other rejection through untouched', async () => {
            const cause = new Error('boom');
            roleService.getWritableByActor.mockResolvedValue(targetRole);
            policyService.createByAdminInTx.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'role-1',
                    body
                )
            ).rejects.toBe(cause);
        });
    });
});
