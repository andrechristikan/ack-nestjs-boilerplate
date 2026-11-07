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

    let useCase: PolicyCreateByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(stagedActivityLog);
        policyUtil.mapActivityLogMetadata.mockReturnValue(policyMetadata);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyCreateByAdminUseCase,
                { provide: PolicyService, useValue: policyService },
                { provide: RoleService, useValue: roleService },
                { provide: PolicyUtil, useValue: policyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
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

            const promise = useCase.execute('role-1', body, actor);

            await expect(promise).rejects.toBe(failure);
            expect(roleService.assertWritableByActor).toHaveBeenCalledWith(
                'role-1',
                { roleId: actor.roleId, roleType: actor.role.type }
            );
            expect(policyService.createByAdmin).not.toHaveBeenCalled();
        });

        it('creates the policy after the role gates and wraps it in the response envelope', async () => {
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.createByAdmin.mockResolvedValue(policy);

            const result = await useCase.execute('role-1', body, actor);

            expect(result).toEqual({ data: policy });
            expect(policyService.createByAdmin).toHaveBeenCalledWith(
                'role-1',
                body
            );
        });

        it('prepares the create activity log with the metadata of the created policy and stages it after the write', async () => {
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.createByAdmin.mockResolvedValue(policy);

            await useCase.execute('role-1', body, actor);

            expect(policyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                policy
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminPolicyCreate,
                metadata: policyMetadata,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the domain throws', async () => {
            roleService.assertWritableByActor.mockResolvedValue();
            policyService.createByAdmin.mockRejectedValue(new Error('boom'));

            await expect(
                useCase.execute('role-1', body, actor)
            ).rejects.toThrow('boom');
            expect(activityLogService.prepare).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
