import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    EnumActivityLogAction,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    type Policy,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyExistException } from '@modules/policy/exceptions/policy.exist.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('PolicyDomain', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const policy = {
        id: 'policy-id',
        roleId: 'role-id',
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies Policy;
    const user = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: true,
        verifiedAt: now,
        email: 'user@example.com',
        roleId: 'role-id',
        password: 'hash',
        passwordExpired: null,
        passwordCreated: now,
        passwordAttempt: 0,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
        role: {
            id: 'role-id',
            name: 'User',
            description: null,
            type: EnumRoleType.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [policy],
        },
        twoFactor: null,
    } satisfies IUser;
    const required = [
        {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.read, EnumPolicyAction.update],
        },
    ];
    const policyRepository: MockProxy<PolicyRepository> =
        mock<PolicyRepository>();
    const policyAbilityFactory: MockProxy<PolicyAbilityFactory> =
        mock<PolicyAbilityFactory>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();

    let service: PolicyDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityFactory.createForUser.mockReturnValue(
            mock<ReturnType<PolicyAbilityFactory['createForUser']>>()
        );
        policyAbilityFactory.handlerPolicies.mockReturnValue(true);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyDomain,
                {
                    provide: PolicyAbilityFactory,
                    useValue: policyAbilityFactory,
                },
                { provide: PolicyRepository, useValue: policyRepository },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
            ],
        }).compile();

        service = moduleRef.get(PolicyDomain);
    });

    it('rejects a request without an authenticated user', () => {
        expect(() =>
            service.validatePolicyGuard(null, [policy], required)
        ).toThrow(AuthJwtAccessTokenInvalidException);
    });

    it('allows a super administrator without predefined policy metadata', () => {
        expect(
            service.validatePolicyGuard(
                {
                    ...user,
                    role: { ...user.role, type: EnumRoleType.superAdmin },
                },
                null,
                []
            )
        ).toBe(true);
    });

    it('rejects a non-super-admin route with no required policy metadata', () => {
        expect(() => service.validatePolicyGuard(user, [policy], [])).toThrow(
            PolicyPredefinedNotFoundException
        );
    });

    it('allows a user holding every required action', () => {
        expect(service.validatePolicyGuard(user, [policy], required)).toBe(
            true
        );
    });

    it('rejects when any required action is absent', () => {
        policyAbilityFactory.handlerPolicies.mockReturnValue(false);
        expect(() =>
            service.validatePolicyGuard(
                user,
                [policy],
                [
                    {
                        subject: EnumPolicySubject.user,
                        action: [
                            EnumPolicyAction.read,
                            EnumPolicyAction.delete,
                        ],
                    },
                ]
            )
        ).toThrow(PolicyForbiddenException);
    });

    it('uses an empty policy set when the guard receives null policies', () => {
        service.validatePolicyGuard(user, null, required);

        expect(policyAbilityFactory.createForUser).toHaveBeenCalledWith([]);
    });

    it('rejects role-scoped reads when the role does not exist', async () => {
        roleDomain.existsById.mockResolvedValue(false);

        await expect(service.findManyByRole('missing')).rejects.toBeInstanceOf(
            RoleNotFoundException
        );
    });

    it('returns policies for an existing role', async () => {
        roleDomain.existsById.mockResolvedValue(true);
        policyRepository.findManyByRoleId.mockResolvedValue([policy]);

        await expect(service.findManyByRole('role-id')).resolves.toEqual([
            policy,
        ]);
    });

    it('rejects duplicate policy creation', async () => {
        roleDomain.existsById.mockResolvedValue(true);
        policyRepository.existsByRoleIdAndSubject.mockResolvedValue(true);

        await expect(
            service.createByAdmin('role-id', required[0])
        ).rejects.toBeInstanceOf(PolicyExistException);
    });

    it('creates a policy and stages its activity', async () => {
        const event = mock<ReturnType<ActivityLogDomain['prepare']>>();
        roleDomain.existsById.mockResolvedValue(true);
        policyRepository.existsByRoleIdAndSubject.mockResolvedValue(false);
        policyRepository.create.mockResolvedValue(policy);
        activityLogDomain.prepare.mockReturnValue(event);

        await expect(
            service.createByAdmin('role-id', required[0])
        ).resolves.toBe(policy);
        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.adminPolicyCreate,
        });
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([event]);
    });

    it.each([
        [
            'update',
            (id: string) =>
                service.updateByAdmin('role-id', id, {
                    action: [EnumPolicyAction.read],
                }),
        ],
        ['delete', (id: string) => service.deleteByAdmin('role-id', id)],
    ])('rejects %s when the policy does not exist', async (_name, run) => {
        roleDomain.existsById.mockResolvedValue(true);
        policyRepository.existsByRoleIdAndId.mockResolvedValue(false);

        await expect(run('missing')).rejects.toBeInstanceOf(
            PolicyNotFoundException
        );
    });

    it('updates a policy and stages its activity', async () => {
        const data = { action: [EnumPolicyAction.read] };
        roleDomain.existsById.mockResolvedValue(true);
        policyRepository.existsByRoleIdAndId.mockResolvedValue(true);
        policyRepository.update.mockResolvedValue(policy);

        await expect(
            service.updateByAdmin('role-id', policy.id, data)
        ).resolves.toBe(policy);
        expect(policyRepository.update).toHaveBeenCalledWith(policy.id, data);
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
    });

    it('deletes a policy and stages its activity', async () => {
        roleDomain.existsById.mockResolvedValue(true);
        policyRepository.existsByRoleIdAndId.mockResolvedValue(true);
        policyRepository.delete.mockResolvedValue(policy);

        await expect(service.deleteByAdmin('role-id', policy.id)).resolves.toBe(
            policy
        );
        expect(policyRepository.delete).toHaveBeenCalledWith(policy.id);
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
    });
});
