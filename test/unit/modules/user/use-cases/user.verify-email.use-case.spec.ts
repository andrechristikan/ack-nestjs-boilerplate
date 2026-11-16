import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { User, Verification } from '@generated/prisma-client/client';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import type { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import { UserVerifyEmailUseCase } from '@modules/user/use-cases/user.verify-email.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserVerifyEmailUseCase', () => {
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();

    let useCase: UserVerifyEmailUseCase;

    const verification: Verification = {
        id: 'verification-wren',
        userId: 'user-wren',
        mobileNumberId: null,
        to: 'wren@example.com',
        type: EnumVerificationType.email,
        action: null,
        token: 'hashed-token',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        verifiedAt: null,
        isUsed: false,
        reference: 'VRF-wren',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const user: User = {
        id: 'user-wren',
        name: 'Wren',
        username: 'wren',
        isVerified: false,
        verifiedAt: null,
        email: 'wren@example.com',
        roleId: 'role-1',
        password: null,
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: 0,
        passwordLockedUntil: null,
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
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };
    beforeEach(async () => {
        vi.resetAllMocks();
        userVerificationService.getOneActiveByEmailToken.mockResolvedValue({
            verification,
            user,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserVerifyEmailUseCase,
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
            ],
        }).compile();
        useCase = module.get(UserVerifyEmailUseCase);
    });

    describe('execute', () => {
        it('verifies the token with the context and answers empty', async () => {
            const dto: UserVerifyEmailRequestDto = { token: 'raw-token' };

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                dto
            );

            expect(result).toEqual({});
            expect(
                userVerificationService.getOneActiveByEmailToken
            ).toHaveBeenCalledWith('raw-token');
            expect(userVerificationService.verifyEmail).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                verification
            );
        });

        it('rejects when the verify write rejects', async () => {
            userVerificationService.verifyEmail.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, {
                    token: 'raw-token',
                })
            ).rejects.toThrow('boom');
        });
    });
});
