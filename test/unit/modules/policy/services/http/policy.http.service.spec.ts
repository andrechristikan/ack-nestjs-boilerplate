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
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyHttpService } from '@modules/policy/services/http/policy.http.service';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';

describe('PolicyHttpService', () => {
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();

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
    const actor: IUser = {
        ...baseUser,
        roleId: 'role-actor',
        role: { ...baseUser.role, id: 'role-actor' },
    };

    let service: PolicyHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyHttpService,
                { provide: PolicyDomain, useValue: policyDomain },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
            ],
        }).compile();

        service = module.get(PolicyHttpService);
    });

    describe('listByRole', () => {
        it('reads nothing when the role gate rejects', async () => {
            const failure = new RoleNotFoundException();
            roleDomain.assertExistsById.mockRejectedValue(failure);

            const promise = service.listByRole('role-1');

            await expect(promise).rejects.toBe(failure);
            expect(roleDomain.assertExistsById).toHaveBeenCalledWith('role-1');
            expect(policyDomain.getManyByRole).not.toHaveBeenCalled();
        });

        it('wraps the policies found for the role in the response envelope', async () => {
            roleDomain.assertExistsById.mockResolvedValue();
            policyDomain.getManyByRole.mockResolvedValue([policy]);

            const result = await service.listByRole('role-1');

            expect(result).toEqual({ data: { policies: [policy] } });
            expect(policyDomain.getManyByRole).toHaveBeenCalledWith('role-1');
        });
    });

    describe('createByAdmin', () => {
        const body: PolicyRequestDto = {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.manage],
        };

        it('writes nothing when the role gate rejects, passing the actor role', async () => {
            const failure = new RoleRankForbiddenException();
            roleDomain.assertWritableByActor.mockRejectedValue(failure);

            const promise = service.createByAdmin('role-1', body, actor);

            await expect(promise).rejects.toBe(failure);
            expect(roleDomain.assertWritableByActor).toHaveBeenCalledWith(
                'role-1',
                { roleId: actor.roleId, roleType: actor.role.type }
            );
            expect(policyDomain.createByAdmin).not.toHaveBeenCalled();
        });

        it('creates the policy after the role gates and wraps it in the response envelope', async () => {
            roleDomain.assertWritableByActor.mockResolvedValue();
            policyDomain.createByAdmin.mockResolvedValue(policy);

            const result = await service.createByAdmin('role-1', body, actor);

            expect(result).toEqual({ data: policy });
            expect(policyDomain.createByAdmin).toHaveBeenCalledWith(
                'role-1',
                body
            );
        });

        it('prepares the create activity log before the write and stages it after', async () => {
            roleDomain.assertWritableByActor.mockResolvedValue();
            policyDomain.createByAdmin.mockImplementation(async () => {
                expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                    action: EnumActivityLogAction.adminPolicyCreate,
                });
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();

                return policy;
            });

            await service.createByAdmin('role-1', body, actor);

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the domain throws', async () => {
            roleDomain.assertWritableByActor.mockResolvedValue();
            policyDomain.createByAdmin.mockRejectedValue(new Error('boom'));

            await expect(
                service.createByAdmin('role-1', body, actor)
            ).rejects.toThrow('boom');
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('updateByAdmin', () => {
        const body: PolicyUpdateRequestDto = {
            action: [EnumPolicyAction.read],
        };

        it('writes nothing when the role gate rejects, passing the actor role', async () => {
            const failure = new RoleRankForbiddenException();
            roleDomain.assertWritableByActor.mockRejectedValue(failure);

            const promise = service.updateByAdmin(
                'role-1',
                'policy-1',
                body,
                actor
            );

            await expect(promise).rejects.toBe(failure);
            expect(roleDomain.assertWritableByActor).toHaveBeenCalledWith(
                'role-1',
                { roleId: actor.roleId, roleType: actor.role.type }
            );
            expect(policyDomain.updateByAdmin).not.toHaveBeenCalled();
        });

        it('updates the policy after the role gates and wraps it in the response envelope', async () => {
            roleDomain.assertWritableByActor.mockResolvedValue();
            policyDomain.updateByAdmin.mockResolvedValue(policy);

            const result = await service.updateByAdmin(
                'role-1',
                'policy-1',
                body,
                actor
            );

            expect(result).toEqual({ data: policy });
            expect(policyDomain.updateByAdmin).toHaveBeenCalledWith(
                'role-1',
                'policy-1',
                body
            );
        });

        it('prepares the update activity log before the write and stages it after', async () => {
            roleDomain.assertWritableByActor.mockResolvedValue();
            policyDomain.updateByAdmin.mockImplementation(async () => {
                expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                    action: EnumActivityLogAction.adminPolicyUpdate,
                });
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();

                return policy;
            });

            await service.updateByAdmin('role-1', 'policy-1', body, actor);

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('deleteByAdmin', () => {
        it('writes nothing when the role gate rejects, passing the actor role', async () => {
            const failure = new RoleRankForbiddenException();
            roleDomain.assertWritableByActor.mockRejectedValue(failure);

            const promise = service.deleteByAdmin('role-1', 'policy-1', actor);

            await expect(promise).rejects.toBe(failure);
            expect(roleDomain.assertWritableByActor).toHaveBeenCalledWith(
                'role-1',
                { roleId: actor.roleId, roleType: actor.role.type }
            );
            expect(policyDomain.deleteByAdmin).not.toHaveBeenCalled();
        });

        it('returns an empty response after deleting the policy', async () => {
            roleDomain.assertWritableByActor.mockResolvedValue();
            policyDomain.deleteByAdmin.mockResolvedValue(policy);

            const result = await service.deleteByAdmin(
                'role-1',
                'policy-1',
                actor
            );

            expect(result).toEqual({});
            expect(policyDomain.deleteByAdmin).toHaveBeenCalledWith(
                'role-1',
                'policy-1'
            );
        });

        it('prepares the delete activity log before the write and stages it after', async () => {
            roleDomain.assertWritableByActor.mockResolvedValue();
            policyDomain.deleteByAdmin.mockImplementation(async () => {
                expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                    action: EnumActivityLogAction.adminPolicyDelete,
                });
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();

                return policy;
            });

            await service.deleteByAdmin('role-1', 'policy-1', actor);

            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });
});
