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
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { OutboxService } from '@common/outbox/services/outbox.service';
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
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
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
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyUpdateByAdminUseCase } from '@modules/policy/use-cases/policy.update-by-admin.use-case';

describe('PolicyUpdateByAdminUseCase', () => {
    const policyService: MockProxy<PolicyService> = mock<PolicyService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const policyUtil: MockProxy<PolicyUtil> = mock<PolicyUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

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
        passwordLockedUntil: null,
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

    const roleInvalidateEffect: ICacheInvalidateEffect = {
        queue: EnumCacheQueue.cache,
        name: EnumCacheProcess.invalidate,
        data: { keys: ['Role:role-1', 'Role:Lease:role-1'] },
        priority: EnumQueuePriority.high,
        idempotencyKey: null,
    };

    let useCase: PolicyUpdateByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.recordEffect.mockReturnValue(effect);
        roleService.invalidateEffect.mockReturnValue(roleInvalidateEffect);
        roleService.getByIdInTx.mockResolvedValue(targetRole);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        policyUtil.mapActivityLogMetadata.mockReturnValue(policyMetadata);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyUpdateByAdminUseCase,
                { provide: PolicyService, useValue: policyService },
                { provide: RoleService, useValue: roleService },
                { provide: PolicyUtil, useValue: policyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        useCase = module.get(PolicyUpdateByAdminUseCase);
    });

    describe('execute', () => {
        const body: PolicyUpdateRequestDto = {
            action: [EnumPolicyAction.read],
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
                'policy-1',
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
            const failure = new PolicyRoleTypeInvalidException();
            roleService.assertWritableByActor.mockResolvedValue();
            roleService.getByIdInTx.mockResolvedValue({
                ...targetRole,
                type: EnumRoleType.user,
            });
            policyService.assertRoleTypeAllowed.mockImplementation(() => {
                throw failure;
            });

            const promise = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                'policy-1',
                body
            );

            await expect(promise).rejects.toBe(failure);
            expect(roleService.getByIdInTx).toHaveBeenCalledWith(tx, 'role-1');
            expect(policyService.assertRoleTypeAllowed).toHaveBeenCalledWith(
                EnumRoleType.user
            );
            expect(policyService.updateByAdminInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('checks the role type of an admin role before the write', async () => {
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.updateByAdminInTx.mockResolvedValue(policy);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                'policy-1',
                body
            );

            expect(roleService.getByIdInTx).toHaveBeenCalledWith(tx, 'role-1');
            expect(policyService.assertRoleTypeAllowed).toHaveBeenCalledWith(
                EnumRoleType.admin
            );
        });

        it('updates the policy on the outbox transaction after the role gate and wraps the response', async () => {
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.updateByAdminInTx.mockResolvedValue(policy);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                'policy-1',
                body
            );

            expect(result).toEqual({ data: policy });
            expect(policyService.updateByAdminInTx).toHaveBeenCalledWith(
                tx,
                'role-1',
                'policy-1',
                body
            );
        });

        it('adds the update activity entry from the policy and the passed context on the same tx', async () => {
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.updateByAdminInTx.mockResolvedValue(policy);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                'policy-1',
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
                    action: EnumActivityLogAction.adminPolicyUpdate,
                    metadata: policyMetadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('adds the role cache invalidate effect for the role id on the same tx', async () => {
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.updateByAdminInTx.mockResolvedValue(policy);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'role-1',
                'policy-1',
                body
            );

            expect(roleService.invalidateEffect).toHaveBeenCalledWith('role-1');
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                roleInvalidateEffect
            );
        });

        it('rethrows a typed exception of the write and adds no entry', async () => {
            const failure = new PolicyNotFoundException();
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.updateByAdminInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'role-1',
                    'policy-1',
                    body
                )
            ).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('maps a write conflict to PolicyNotFoundException', async () => {
            const conflict = new Error('conflict');
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.updateByAdminInTx.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'role-1',
                    'policy-1',
                    body
                )
            ).rejects.toBeInstanceOf(PolicyNotFoundException);
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('boom');
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.updateByAdminInTx.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'role-1',
                    'policy-1',
                    body
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
