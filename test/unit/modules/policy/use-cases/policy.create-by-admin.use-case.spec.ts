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
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import {
    EnumCacheProcess,
    EnumCacheQueue,
} from '@common/cache/enums/cache.enum';
import type { ICacheInvalidateEffect } from '@common/cache/interfaces/cache.interface';
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
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
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

    const roleInvalidateEffect: ICacheInvalidateEffect = {
        queue: EnumCacheQueue.cache,
        name: EnumCacheProcess.invalidate,
        data: { keys: ['Role:role-1', 'Role:Lease:role-1'] },
        priority: EnumQueuePriority.high,
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
        activityLogService.recordEffect.mockReturnValue(effect);
        roleService.invalidateEffect.mockReturnValue(roleInvalidateEffect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        roleService.getByIdInTx.mockResolvedValue(targetRole);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyCreateByAdminUseCase,
                { provide: PolicyService, useValue: policyService },
                { provide: RoleService, useValue: roleService },
                PolicyUtil,
                { provide: ActivityLogService, useValue: activityLogService },
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
            roleService.assertWritableByActor.mockRejectedValue(failure);

            const promise = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                body
            );

            await expect(promise).rejects.toBe(failure);
            expect(roleService.assertWritableByActor).toHaveBeenCalledWith(
                'role-1',
                { roleId: actor.roleId, roleType: actor.role.type }
            );
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('writes nothing when the role is user-type', async () => {
            const userRole: IRole = { ...targetRole, type: EnumRoleType.user };
            const failure = new PolicyRoleTypeInvalidException();
            roleService.assertWritableByActor.mockResolvedValue();
            roleService.getByIdInTx.mockResolvedValue(userRole);
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
            expect(roleService.getByIdInTx).toHaveBeenCalledWith(tx, 'role-1');
            expect(policyService.assertRoleTypeAllowed).toHaveBeenCalledWith(
                EnumRoleType.user
            );
            expect(policyService.createByAdminInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('checks the role type of an admin role before the write', async () => {
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.createByAdminInTx.mockResolvedValue(policy);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                body
            );

            expect(roleService.getByIdInTx).toHaveBeenCalledWith(tx, 'role-1');
            expect(policyService.assertRoleTypeAllowed).toHaveBeenCalledWith(
                EnumRoleType.admin
            );
        });

        it('creates the policy on the outbox transaction after the role gate and wraps it in the response envelope', async () => {
            roleService.assertWritableByActor.mockResolvedValue();
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

        it('adds the create activity entry from the created policy and the passed context on the same tx', async () => {
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.createByAdminInTx.mockResolvedValue(policy);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                body
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminPolicyCreate,
                    metadata: policyMetadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('adds the role cache invalidate effect for the role id on the same tx', async () => {
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.createByAdminInTx.mockResolvedValue(policy);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                body
            );

            expect(roleService.invalidateEffect).toHaveBeenCalledWith('role-1');
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                roleInvalidateEffect
            );
        });

        it('adds no entry when the write throws', async () => {
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.createByAdminInTx.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'role-1',
                    body
                )
            ).rejects.toThrow('boom');
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });
});
