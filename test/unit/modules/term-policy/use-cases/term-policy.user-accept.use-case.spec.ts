import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyUserAcceptUseCase } from '@modules/term-policy/use-cases/term-policy.user-accept.use-case';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('TermPolicyUserAcceptUseCase', () => {
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();

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
        passwordLockedUntil: null,
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
        photo: null,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            scope: EnumRoleScope.platform,
            key: 'user',
            name: 'User',
            policyRevision: 0,
        },
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(user.id);

    let useCase: TermPolicyUserAcceptUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyUserAcceptUseCase,
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
            ],
        }).compile();

        useCase = module.get(TermPolicyUserAcceptUseCase);
    });

    describe('execute', () => {
        it('accepts the type for the user passing the request context and returns an empty envelope', async () => {
            termPolicyAcceptanceService.userAccept.mockResolvedValue();

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    type: EnumTermPolicyType.privacy,
                }
            );

            expect(result).toEqual({});
            expect(termPolicyAcceptanceService.userAccept).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                EnumTermPolicyType.privacy
            );
        });

        it('rethrows the domain rejection', async () => {
            const error = new Error('already accepted');
            termPolicyAcceptanceService.userAccept.mockRejectedValue(error);

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, {
                    type: EnumTermPolicyType.privacy,
                })
            ).rejects.toBe(error);
        });
    });
});
