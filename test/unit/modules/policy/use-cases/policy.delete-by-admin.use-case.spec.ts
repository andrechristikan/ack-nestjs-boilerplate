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
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type {
    IActivityLogMetadata,
    IActivityLogStaged,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import { RoleService } from '@modules/role/services/role.service';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { PolicyDeleteByAdminUseCase } from '@modules/policy/use-cases/policy.delete-by-admin.use-case';

describe('PolicyDeleteByAdminUseCase', () => {
    const policyService: MockProxy<PolicyService> = mock<PolicyService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const policyUtil: MockProxy<PolicyUtil> = mock<PolicyUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

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

    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.adminPolicyCreate,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
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

    let useCase: PolicyDeleteByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);
        policyUtil.mapActivityLogMetadata.mockReturnValue(policyMetadata);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyDeleteByAdminUseCase,
                { provide: PolicyService, useValue: policyService },
                { provide: RoleService, useValue: roleService },
                { provide: PolicyUtil, useValue: policyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(PolicyDeleteByAdminUseCase);
    });

    describe('execute', () => {
        it('writes nothing when the role gate rejects, passing the actor role', async () => {
            const failure = new RoleRankForbiddenException();
            roleService.assertWritableByActor.mockRejectedValue(failure);

            const promise = useCase.execute('role-1', 'policy-1', actor);

            await expect(promise).rejects.toBe(failure);
            expect(roleService.assertWritableByActor).toHaveBeenCalledWith(
                'role-1',
                { roleId: actor.roleId, roleType: actor.role.type }
            );
            expect(policyService.deleteByAdmin).not.toHaveBeenCalled();
        });

        it('returns an empty response after deleting the policy', async () => {
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.deleteByAdmin.mockResolvedValue(policy);

            const result = await useCase.execute('role-1', 'policy-1', actor);

            expect(result).toEqual({});
            expect(policyService.deleteByAdmin).toHaveBeenCalledWith(
                'role-1',
                'policy-1'
            );
        });

        it('prepares the delete activity log with the metadata of the deleted policy and stages it after the write', async () => {
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.deleteByAdmin.mockResolvedValue(policy);

            await useCase.execute('role-1', 'policy-1', actor);

            expect(policyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                policy
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminPolicyDelete,
                metadata: policyMetadata,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });
});
