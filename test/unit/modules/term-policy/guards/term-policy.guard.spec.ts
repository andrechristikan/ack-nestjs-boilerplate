import { HttpStatus } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { TermPolicyRequiredGuardMetaKey } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import { TermPolicyGuard } from '@modules/term-policy/guards/term-policy.guard';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('TermPolicyGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const termPolicyAcceptanceDomain: MockProxy<TermPolicyAcceptanceDomain> =
        mock<TermPolicyAcceptanceDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const user: IUser = {
        id: 'user-1',
        name: 'Andre Christi',
        username: 'johnSmith123',
        isVerified: true,
        verifiedAt: timestamp,
        email: 'andre@example.com',
        roleId: 'role-1',
        password: 'hashed-password',
        passwordExpired: null,
        passwordCreated: timestamp,
        passwordAttempt: 0,
        signUpAt: timestamp,
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
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
        photo: null,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            name: 'User',
            description: null,
            type: EnumRoleType.user,
            createdAt: timestamp,
            createdBy: null,
            updatedAt: timestamp,
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    let guard: TermPolicyGuard;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyGuard,
                { provide: Reflector, useValue: reflector },
                {
                    provide: TermPolicyAcceptanceDomain,
                    useValue: termPolicyAcceptanceDomain,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        guard = module.get(TermPolicyGuard);
    });

    describe('canActivate', () => {
        it('reads the required term policies and the user, then delegates to the domain', async () => {
            const requiredTermPolicies = [EnumTermPolicyType.privacy];
            reflector.get.mockReturnValue(requiredTermPolicies);
            requestStoreService.get.mockReturnValue(user);
            termPolicyAcceptanceDomain.validateTermPolicyGuard.mockResolvedValue(
                undefined
            );

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(reflector.get).toHaveBeenCalledWith(
                TermPolicyRequiredGuardMetaKey,
                executionContext.getHandler()
            );
            expect(requestStoreService.get).toHaveBeenCalledWith(UserStoreKey);
            expect(
                termPolicyAcceptanceDomain.validateTermPolicyGuard
            ).toHaveBeenCalledWith(user, requiredTermPolicies);
        });

        it('throws UserGuardMissingException before the domain call when the user store is empty', async () => {
            reflector.get.mockReturnValue([]);
            requestStoreService.get.mockReturnValue(null);

            await expect(
                guard.canActivate(executionContext)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.guardMissing
                    ],
                messagePath: 'user.error.guardMissing',
                httpStatus: HttpStatus.UNAUTHORIZED,
            });
            expect(
                termPolicyAcceptanceDomain.validateTermPolicyGuard
            ).not.toHaveBeenCalled();
        });

        it('propagates the exception the domain throws for a missing acceptance', async () => {
            reflector.get.mockReturnValue([]);
            requestStoreService.get.mockReturnValue(user);
            const rejection = new Error('required-invalid');
            termPolicyAcceptanceDomain.validateTermPolicyGuard.mockRejectedValue(
                rejection
            );

            await expect(guard.canActivate(executionContext)).rejects.toBe(
                rejection
            );
        });
    });
});
