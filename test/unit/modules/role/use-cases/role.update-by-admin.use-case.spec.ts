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
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogAction,
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import type {
    IRole,
    IRoleWithPolicies,
} from '@modules/role/interfaces/role.interface';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { RoleUpdateByAdminUseCase } from '@modules/role/use-cases/role.update-by-admin.use-case';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('RoleUpdateByAdminUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const roleUtil: MockProxy<RoleUtil> = mock<RoleUtil>();
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    const now = new Date('2026-01-20T00:00:00.000Z');
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
    const roleWithPolicies: IRoleWithPolicies = {
        ...role,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        policies: [],
    };
    const effect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const metadata = { roleId: 'role-1' };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const user = buildUser('user-1', 'admin@example.com');
    const userContext = buildUserContext(user);
    const authContext = buildAuthJwtAccessContext(user.id);
    const actor = { roleId: user.roleId, roleKey: user.role.key };

    let useCase: RoleUpdateByAdminUseCase;

    const body = { name: 'Renamed', description: null };

    const args = [
        requestContext,
        apiKeyContext,
        authContext,
        userContext,
        policyContext,
        'role-1',
        body,
    ] as const;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(where);
        helperDateService.create.mockReturnValue(now);
        roleUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.recordEffect.mockReturnValue(effect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        roleService.updateByAdminInTx.mockResolvedValue(roleWithPolicies);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleUpdateByAdminUseCase,
                { provide: RoleService, useValue: roleService },
                { provide: RoleUtil, useValue: roleUtil },
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(RoleUpdateByAdminUseCase);
    });

    describe('execute', () => {
        it('updates the role inside the update predicate and wraps the result', async () => {
            const result = await useCase.execute(...args);

            expect(result).toEqual({ data: roleWithPolicies });
            expect(policyAbilityService.scope).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.update,
                EnumPolicySubject.Role
            );
            expect(roleService.updateByAdminInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                { name: 'Renamed', description: null },
                actor,
                where
            );
        });

        it('adds the update activity entry on the same transaction', async () => {
            await useCase.execute(...args);

            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.adminRoleUpdate, metadata }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('rethrows our own exception untouched', async () => {
            const failure = new RoleNotFoundException();
            roleService.updateByAdminInTx.mockRejectedValue(failure);

            await expect(useCase.execute(...args)).rejects.toBe(failure);
        });

        it('maps a write conflict to role not found', async () => {
            const failure = new Error('conflict');
            roleService.updateByAdminInTx.mockRejectedValue(failure);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(useCase.execute(...args)).rejects.toThrow(
                RoleNotFoundException
            );
        });

        it('wraps any other failure as unknown', async () => {
            roleService.updateByAdminInTx.mockRejectedValue(new Error('boom'));
            databaseUtil.toException.mockReturnValue(null);

            await expect(useCase.execute(...args)).rejects.toThrow(
                AppUnknownException
            );
        });
    });
});
