import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it } from 'vitest';

import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    type Policy,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
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
    const policyRepository = createMock<PolicyRepository>();
    const policyAbilityFactory = new PolicyAbilityFactory();
    const roleDomain = createMock<RoleDomain>();
    const activityLogDomain = createMock<ActivityLogDomain>();

    let service: PolicyDomain;

    beforeEach(async () => {
        service = new PolicyDomain(
            policyAbilityFactory,
            policyRepository,
            roleDomain,
            activityLogDomain
        );
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
});
