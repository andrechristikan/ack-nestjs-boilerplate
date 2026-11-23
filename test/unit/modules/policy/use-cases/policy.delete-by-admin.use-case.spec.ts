import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import {
    EnumActivityLogAction,
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyDeleteByAdminUseCase } from '@modules/policy/use-cases/policy.delete-by-admin.use-case';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { RoleService } from '@modules/role/services/role.service';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('PolicyDeleteByAdminUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const policyService: MockProxy<PolicyService> = mock<PolicyService>();
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const policyUtil: MockProxy<PolicyUtil> = mock<PolicyUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    const where: IPolicyWhereInput<'Role'> = { scope: EnumRoleScope.platform };
    const role: IRole = {
        id: 'role-1',
        scope: EnumRoleScope.platform,
        key: 'auditor',
        name: 'Auditor',
        description: null,
        policyRevision: 0,
        isImmutable: false,
    };
    const policy: Policy = {
        id: 'policy-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        roleId: 'role-1',
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
        conditions: null,
        inverted: false,
        reason: null,
    };
    const effect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const user = buildUser('user-1', 'admin@example.com');
    const userContext = buildUserContext(user);
    const authContext = buildAuthJwtAccessContext(user.id);

    let useCase: PolicyDeleteByAdminUseCase;

    const args = [
        requestContext,
        apiKeyContext,
        authContext,
        userContext,
        policyContext,
        'role-1',
        'policy-1',
    ] as const;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(where);
        roleService.getWritableByActor.mockResolvedValue(role);
        policyService.deleteByAdminInTx.mockResolvedValue(policy);
        policyUtil.mapActivityLogMetadata.mockReturnValue({ roleId: 'role-1' });
        activityLogService.recordEffect.mockReturnValue(effect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyDeleteByAdminUseCase,
                { provide: PolicyService, useValue: policyService },
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                { provide: RoleService, useValue: roleService },
                { provide: PolicyUtil, useValue: policyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        useCase = module.get(PolicyDeleteByAdminUseCase);
    });

    describe('execute', () => {
        it('loads the role inside the read predicate for the acting platform role', async () => {
            await useCase.execute(...args);

            expect(policyAbilityService.scope).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.read,
                EnumPolicySubject.Role
            );
            expect(roleService.getWritableByActor).toHaveBeenCalledWith(
                'role-1',
                { roleId: user.roleId, roleKey: user.role.key },
                where
            );
        });

        it('refuses a role whose policies are fixed, then authorizes an update on the role record', async () => {
            await useCase.execute(...args);

            expect(policyService.assertRoleWritable).toHaveBeenCalledWith(role);
            expect(policyAbilityService.authorize).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.update,
                expect.objectContaining({
                    __caslSubjectType__: 'Role',
                    id: 'role-1',
                })
            );
        });

        it('deletes the policy and bumps the role revision on one transaction, then records the activity', async () => {
            const result = await useCase.execute(...args);

            expect(result).toEqual({});
            expect(policyService.deleteByAdminInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                'policy-1'
            );
            expect(roleService.bumpPolicyRevisionInTx).toHaveBeenCalledWith(
                tx,
                'role-1'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminPolicyDelete,
                    metadata: { roleId: 'role-1' },
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('stops before any write when the role is unreachable', async () => {
            roleService.getWritableByActor.mockRejectedValue(
                new RoleNotFoundException()
            );

            await expect(useCase.execute(...args)).rejects.toThrow(
                RoleNotFoundException
            );
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('stops before any write when the ability denies the update', async () => {
            policyAbilityService.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(useCase.execute(...args)).rejects.toThrow(
                PolicyForbiddenException
            );
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('maps a write conflict to policy not found', async () => {
            const failure = new Error('conflict');
            policyService.deleteByAdminInTx.mockRejectedValue(failure);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(useCase.execute(...args)).rejects.toThrow(
                PolicyNotFoundException
            );
        });

        it('wraps an unknown write failure', async () => {
            policyService.deleteByAdminInTx.mockRejectedValue(
                new Error('boom')
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(useCase.execute(...args)).rejects.toThrow(
                AppUnknownException
            );
        });

        it('does not bump the revision or record an entry when the delete fails', async () => {
            const failure = new PolicyNotFoundException();
            policyService.deleteByAdminInTx.mockRejectedValue(failure);

            await expect(useCase.execute(...args)).rejects.toBe(failure);
            expect(roleService.bumpPolicyRevisionInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });
});
