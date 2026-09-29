import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import {
    PolicyRequiredMetaKey,
    PolicyStoreKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';

function buildUser(overrides: Partial<IUser> = {}): IUser {
    return {
        id: 'user-1',
        name: 'Jane Doe',
        username: 'jane',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'jane@example.com',
        roleId: 'role-1',
        password: 'hashed-password',
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
        ...overrides,
    };
}

describe('PolicyGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const executionContext = mock<ExecutionContext>();

    let guard: PolicyGuard;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
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

        guard = module.get(PolicyGuard);
    });

    describe('canActivate', () => {
        it('reads the required policies, user, and policies from their stores and delegates to the domain', async () => {
            const requiredPolicies: PolicyRequestDto[] = [
                {
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.manage],
                },
            ];
            const user = buildUser();
            const policies: Policy[] = [];
            reflector.get.mockReturnValue(requiredPolicies);
            requestStoreService.get.mockImplementation((key: string) => {
                if (key === UserStoreKey) {
                    return user;
                }
                if (key === PolicyStoreKey) {
                    return policies;
                }
                return null;
            });
            policyDomain.validatePolicyGuard.mockReturnValue(true);

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(reflector.get).toHaveBeenCalledWith(
                PolicyRequiredMetaKey,
                executionContext.getHandler()
            );
            expect(policyDomain.validatePolicyGuard).toHaveBeenCalledWith(
                user,
                policies,
                requiredPolicies
            );
        });

        it('defaults required policies to an empty array when no metadata is set', async () => {
            reflector.get.mockReturnValue(undefined);
            requestStoreService.get.mockReturnValue(null);
            policyDomain.validatePolicyGuard.mockReturnValue(true);

            await guard.canActivate(executionContext);

            expect(policyDomain.validatePolicyGuard).toHaveBeenCalledWith(
                null,
                null,
                []
            );
        });

        it('propagates a false result from the domain', async () => {
            reflector.get.mockReturnValue([]);
            requestStoreService.get.mockReturnValue(null);
            policyDomain.validatePolicyGuard.mockReturnValue(false);

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                false
            );
        });
    });
});
