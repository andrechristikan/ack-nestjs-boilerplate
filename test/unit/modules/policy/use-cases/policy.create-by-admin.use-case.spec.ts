import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { RoleService } from '@modules/role/services/role.service';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { PolicyCreateByAdminUseCase } from '@modules/policy/use-cases/policy.create-by-admin.use-case';

describe('PolicyCreateByAdminUseCase', () => {
    const policyService: MockProxy<PolicyService> = mock<PolicyService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const policyUtil: MockProxy<PolicyUtil> = mock<PolicyUtil>();
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

    const baseUser: IUser = {
        id: 'user-1',
        name: 'Andre Christi',
        username: 'johnSmith123',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'andre@example.com',
        roleId: 'role-1',
        password: 'hashed-password',
        passwordExpired: null,
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            name: 'Admin',
            description: null,
            type: EnumRoleType.admin,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [policy],
        },
        twoFactor: null,
    };

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
    const effect: IOutboxEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    let useCase: PolicyCreateByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.recordEffect.mockReturnValue(effect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        policyUtil.mapActivityLogMetadata.mockReturnValue(policyMetadata);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyCreateByAdminUseCase,
                { provide: PolicyService, useValue: policyService },
                { provide: RoleService, useValue: roleService },
                { provide: PolicyUtil, useValue: policyUtil },
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

            expect(policyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                policy
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
