import { subject } from '@casl/ability';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
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
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import type {
    IRole,
    IRoleWithPolicies,
} from '@modules/role/interfaces/role.interface';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { RoleCreateByAdminUseCase } from '@modules/role/use-cases/role.create-by-admin.use-case';

describe('RoleCreateByAdminUseCase', () => {
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

    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const now = new Date('2026-01-20T00:00:00.000Z');
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

    let useCase: RoleCreateByAdminUseCase;

    const body = {
        scope: EnumRoleScope.platform,
        key: 'auditor',
        name: 'Auditor',
    };

    const args = [
        requestContext,
        apiKeyContext,
        authContext,
        userContext,
        policyContext,
        body,
    ] as const;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        roleUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.recordEffect.mockReturnValue(effect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        databaseUtil.createId.mockReturnValue('role-1');
        roleService.createByAdminInTx.mockResolvedValue(roleWithPolicies);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleCreateByAdminUseCase,
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

        useCase = module.get(RoleCreateByAdminUseCase);
    });

    describe('execute', () => {
        it('creates the role under a fresh id for the acting platform role and wraps the result', async () => {
            const result = await useCase.execute(...args);

            expect(result).toEqual({ data: roleWithPolicies });
            expect(roleService.createByAdminInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                {
                    scope: EnumRoleScope.platform,
                    key: 'auditor',
                    name: 'Auditor',
                    description: null,
                },
                actor
            );
        });

        it('authorizes the create of the requested role', async () => {
            await useCase.execute(...args);

            expect(policyAbilityService.authorize).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.create,
                subject(EnumPolicySubject.Role, {
                    scope: EnumRoleScope.platform,
                    key: 'auditor',
                })
            );
        });

        it('leaves the services uncalled when the ability refuses the create', async () => {
            policyAbilityService.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(useCase.execute(...args)).rejects.toBeInstanceOf(
                PolicyForbiddenException
            );
            expect(roleService.createByAdminInTx).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('adds the create activity entry from the created role on the same transaction', async () => {
            await useCase.execute(...args);

            expect(roleUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                roleWithPolicies,
                now
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.adminRoleCreate, metadata }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('adds no entry when the write throws', async () => {
            const failure = new Error('create failed');
            roleService.createByAdminInTx.mockRejectedValue(failure);

            await expect(useCase.execute(...args)).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });
});
