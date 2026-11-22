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
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserSendVerificationEmailUseCase } from '@modules/user/use-cases/user.send-verification-email.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserSendVerificationEmailUseCase', () => {
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();

    let useCase: UserSendVerificationEmailUseCase;

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
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };
    beforeEach(async () => {
        vi.resetAllMocks();
        userVerificationService.getOneForResendByEmail.mockResolvedValue(user);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserSendVerificationEmailUseCase,
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
            ],
        }).compile();
        useCase = module.get(UserSendVerificationEmailUseCase);
    });

    describe('execute', () => {
        const dto: UserSendEmailVerificationRequestDto = {
            email: 'wren@example.com',
        };

        it('sends the verification email through the service with the context and answers empty', async () => {
            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                dto
            );

            expect(result).toEqual({});
            expect(
                userVerificationService.getOneForResendByEmail
            ).toHaveBeenCalledWith('wren@example.com');
            expect(userVerificationService.sendEmail).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                'user-wren',
                'wren@example.com'
            );
        });

        it('answers empty and sends nothing when the account is missing, inactive, or already verified', async () => {
            userVerificationService.getOneForResendByEmail.mockResolvedValue(
                null
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({});

            expect(userVerificationService.sendEmail).not.toHaveBeenCalled();
        });

        it('rejects when the send rejects', async () => {
            userVerificationService.sendEmail.mockRejectedValue(
                new Error('commit-failed')
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toThrow('commit-failed');
        });
    });
});
