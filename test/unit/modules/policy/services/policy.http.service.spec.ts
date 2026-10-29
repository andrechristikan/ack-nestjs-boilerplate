import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyHttpService } from '@modules/policy/services/policy.http.service';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';

describe('PolicyHttpService', () => {
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();

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

    let service: PolicyHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyHttpService,
                { provide: PolicyDomain, useValue: policyDomain },
            ],
        }).compile();

        service = module.get(PolicyHttpService);
    });

    describe('listByRole', () => {
        it('wraps the policies found for the role in the response envelope', async () => {
            policyDomain.getManyByRole.mockResolvedValue([policy]);

            const result = await service.listByRole('role-1');

            expect(result).toEqual({ data: { policies: [policy] } });
            expect(policyDomain.getManyByRole).toHaveBeenCalledWith('role-1');
        });
    });

    describe('createByAdmin', () => {
        it('wraps the created policy in the response envelope', async () => {
            const body: PolicyRequestDto = {
                subject: EnumPolicySubject.user,
                action: [EnumPolicyAction.manage],
            };
            policyDomain.createByAdmin.mockResolvedValue(policy);

            const result = await service.createByAdmin(
                'role-1',
                body,
                baseUser
            );

            expect(result).toEqual({ data: policy });
            expect(policyDomain.createByAdmin).toHaveBeenCalledWith(
                'role-1',
                body,
                { roleId: 'role-1', roleType: EnumRoleType.admin }
            );
        });
    });

    describe('updateByAdmin', () => {
        it('wraps the updated policy in the response envelope', async () => {
            const body: PolicyUpdateRequestDto = {
                action: [EnumPolicyAction.read],
            };
            policyDomain.updateByAdmin.mockResolvedValue(policy);

            const result = await service.updateByAdmin(
                'role-1',
                'policy-1',
                body,
                baseUser
            );

            expect(result).toEqual({ data: policy });
            expect(policyDomain.updateByAdmin).toHaveBeenCalledWith(
                'role-1',
                'policy-1',
                body,
                { roleId: 'role-1', roleType: EnumRoleType.admin }
            );
        });
    });

    describe('deleteByAdmin', () => {
        it('returns an empty response after deleting the policy', async () => {
            policyDomain.deleteByAdmin.mockResolvedValue(policy);

            const result = await service.deleteByAdmin(
                'role-1',
                'policy-1',
                baseUser
            );

            expect(result).toEqual({});
            expect(policyDomain.deleteByAdmin).toHaveBeenCalledWith(
                'role-1',
                'policy-1',
                { roleId: 'role-1', roleType: EnumRoleType.admin }
            );
        });
    });
});
