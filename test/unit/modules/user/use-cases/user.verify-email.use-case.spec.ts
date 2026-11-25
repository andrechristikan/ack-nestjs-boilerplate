import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
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
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import type { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import { UserVerifyEmailUseCase } from '@modules/user/use-cases/user.verify-email.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';

describe('UserVerifyEmailUseCase', () => {
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const tx = {} as IDatabaseTransactionClient;

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
        lastIpAddress: null,
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
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
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
                { provide: DatabaseService, useValue: databaseService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();
        useCase = module.get(UserVerifyEmailUseCase);
    });

    describe('execute', () => {
        const dto: UserVerifyEmailRequestDto = { token: 'raw-token' };

        it('opens one transaction over verifyEmailInTx and answers empty', async () => {
            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                dto
            );

            expect(result).toEqual({});
            expect(
                userVerificationService.getOneActiveByEmailToken
            ).toHaveBeenCalledWith('raw-token');
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userVerificationService.verifyEmailInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                verification
            );
        });

        it('leaves withTransaction uncalled when the token is refused', async () => {
            userVerificationService.getOneActiveByEmailToken.mockRejectedValue(
                new UserNotFoundException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
            });

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('passes the UserTokenInvalidException the transaction rejected through untouched', async () => {
            const error = new UserTokenInvalidException();
            userVerificationService.verifyEmailInTx.mockRejectedValue(error);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(error);
        });
    });
});
