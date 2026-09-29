import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client';
import type { IPolicyRequired } from '@modules/policy/interfaces/policy.interface';
import type { IPolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyRequiredMetaKey } from '@modules/policy/constants/policy.constant';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('PolicyGuard', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const user = {
        id: 'user-1',
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
            scope: EnumRoleScope.platform,
            key: EnumRolePlatformKey.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    } satisfies IUser;
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const ability: MockProxy<IPolicyAbility> = mock<IPolicyAbility>();
    const handler = () => undefined;
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    let guard: PolicyGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        context.getHandler.mockReturnValue(handler);
        requestStoreService.get.mockImplementation(key =>
            key === PolicyAbilityStoreKey ? ability : user
        );

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyGuard,
                { provide: Reflector, useValue: reflector },
                { provide: PolicyDomain, useValue: policyDomain },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = moduleRef.get(PolicyGuard);
    });

    it('throws AuthJwtAccessTokenInvalidException when the request has no user, before any metadata or ability work', () => {
        requestStoreService.get.mockReturnValue(null);

        expect(() => guard.canActivate(context)).toThrow(
            AuthJwtAccessTokenInvalidException
        );
        expect(requestStoreService.get).toHaveBeenCalledWith(UserStoreKey);
        expect(reflector.get).not.toHaveBeenCalled();
        expect(policyDomain.assertCan).not.toHaveBeenCalled();
    });

    it.each([
        ['empty', []],
        ['absent', undefined],
    ])(
        'throws PolicyPredefinedNotFoundException when the metadata is %s',
        (_name, metadata) => {
            reflector.get.mockReturnValue(metadata);

            expect(() => guard.canActivate(context)).toThrow(
                PolicyPredefinedNotFoundException
            );
            expect(reflector.get).toHaveBeenCalledWith(
                PolicyRequiredMetaKey,
                handler
            );
            expect(policyDomain.assertCan).not.toHaveBeenCalled();
        }
    );

    it('asserts one subject and one action once', () => {
        reflector.get.mockReturnValue([
            {
                subject: EnumPolicySubject.User,
                action: [EnumPolicyAction.read],
            },
        ] satisfies IPolicyRequired[]);

        expect(guard.canActivate(context)).toBe(true);
        expect(policyDomain.assertCan).toHaveBeenCalledTimes(1);
        expect(policyDomain.assertCan).toHaveBeenCalledWith(
            ability,
            EnumPolicyAction.read,
            EnumPolicySubject.User
        );
    });

    it('asserts every action of every subject in order', () => {
        reflector.get.mockReturnValue([
            {
                subject: EnumPolicySubject.User,
                action: [EnumPolicyAction.read, EnumPolicyAction.update],
            },
            {
                subject: EnumPolicySubject.Role,
                action: [EnumPolicyAction.create, EnumPolicyAction.delete],
            },
        ] satisfies IPolicyRequired[]);

        expect(guard.canActivate(context)).toBe(true);
        expect(policyDomain.assertCan).toHaveBeenCalledTimes(4);
        expect(policyDomain.assertCan).toHaveBeenNthCalledWith(
            1,
            ability,
            EnumPolicyAction.read,
            EnumPolicySubject.User
        );
        expect(policyDomain.assertCan).toHaveBeenNthCalledWith(
            2,
            ability,
            EnumPolicyAction.update,
            EnumPolicySubject.User
        );
        expect(policyDomain.assertCan).toHaveBeenNthCalledWith(
            3,
            ability,
            EnumPolicyAction.create,
            EnumPolicySubject.Role
        );
        expect(policyDomain.assertCan).toHaveBeenNthCalledWith(
            4,
            ability,
            EnumPolicyAction.delete,
            EnumPolicySubject.Role
        );
    });

    it('propagates the reason carried by a denying assertCan', () => {
        reflector.get.mockReturnValue([
            {
                subject: EnumPolicySubject.User,
                action: [EnumPolicyAction.read],
            },
        ] satisfies IPolicyRequired[]);
        policyDomain.assertCan.mockImplementation(() => {
            throw new PolicyForbiddenException('blocked by rule');
        });

        try {
            guard.canActivate(context);
            throw new Error('expected throw');
        } catch (error) {
            expect(error).toBeInstanceOf(PolicyForbiddenException);
            expect(error).toMatchObject({
                metadata: { reason: 'blocked by rule' },
            });
        }
    });

    it('propagates a denying assertCan without returning true', () => {
        reflector.get.mockReturnValue([
            {
                subject: EnumPolicySubject.User,
                action: [EnumPolicyAction.read, EnumPolicyAction.update],
            },
        ] satisfies IPolicyRequired[]);
        policyDomain.assertCan.mockImplementationOnce(() => undefined);
        policyDomain.assertCan.mockImplementationOnce(() => {
            throw new PolicyForbiddenException();
        });

        expect(() => guard.canActivate(context)).toThrow(
            PolicyForbiddenException
        );
        expect(policyDomain.assertCan).toHaveBeenCalledTimes(2);
    });
});
