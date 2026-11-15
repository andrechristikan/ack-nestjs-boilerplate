import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumDevicePlatform,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type {
    IUser,
    IUserTwoFactorChallenge,
} from '@modules/user/interfaces/user.interface';
import { UserLoginSetupTwoFactorUseCase } from '@modules/user/use-cases/user.login-setup-two-factor.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserLoginSetupTwoFactorUseCase', () => {
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    let useCase: UserLoginSetupTwoFactorUseCase;

    const deviceIdentity: IDeviceIdentity = {
        fingerprint: 'device-bramble',
        name: null,
        platform: EnumDevicePlatform.web,
        notificationToken: null,
    };
    const twoFactor: TwoFactor = {
        id: 'two-factor-bramble',
        userId: 'user-bramble',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        lockedUntil: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const baseUser: IUser = {
        id: 'user-bramble',
        name: 'Bramble Fox',
        username: 'bramble2fox',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'bramble@example.com',
        roleId: 'role-bramble',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-bramble',
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
            id: 'role-bramble',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    const enabledTwoFactor = { ...twoFactor, enabled: true };
    const twoFactorUser: IUser = {
        ...baseUser,
        twoFactor: enabledTwoFactor,
    };
    const challenge: IUserTwoFactorChallenge = {
        userId: 'user-bramble',
        device: deviceIdentity,
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginSetupTwoFactorUseCase,
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserLoginSetupTwoFactorUseCase);
    });

    describe('execute', () => {
        const dto = { challengeToken: 'challenge-token', code: '123456' };

        beforeEach(() => {
            userTwoFactorService.checkSetupCode.mockResolvedValue(58123456);
            userTwoFactorService.getChallenge.mockResolvedValue(challenge);
            userTwoFactorService.getOneForLoginSetup.mockResolvedValue({
                user: twoFactorUser,
                pendingSecret: 'pending-secret',
            });
            userTwoFactorService.enableTwoFactorInTx.mockResolvedValue([
                'backup-one',
            ]);
        });

        it('checks the setup code against the pending secret before the transaction, then verifies the step and enables on one tx', async () => {
            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: { backupCodes: ['backup-one'] },
            });

            expect(
                userTwoFactorService.getOneForLoginSetup
            ).toHaveBeenCalledWith('user-bramble');
            expect(userTwoFactorService.checkSetupCode).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                twoFactorUser,
                'pending-secret',
                '123456'
            );
            expect(
                userTwoFactorService.verifySetupCodeInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble', 58123456);
            expect(
                userTwoFactorService.enableTwoFactorInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                'user-bramble',
                'pending-secret'
            );
            expect(userTwoFactorService.checkSetupCode).toHaveBeenCalledBefore(
                outboxService.withTransaction
            );
            expect(
                userTwoFactorService.verifySetupCodeInTx
            ).toHaveBeenCalledBefore(userTwoFactorService.enableTwoFactorInTx);
        });

        it('throws AuthTwoFactorChallengeInvalidException without reading the user when the challenge is missing', async () => {
            userTwoFactorService.getChallenge.mockRejectedValue(
                new AuthTwoFactorChallengeInvalidException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
            expect(
                userTwoFactorService.getOneForLoginSetup
            ).not.toHaveBeenCalled();
        });

        it('answers the two-factor attempt limit of the check and writes nothing', async () => {
            userTwoFactorService.checkSetupCode.mockRejectedValue(
                new AuthTwoFactorAttemptMaxException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptMax
                    ],
                messagePath: 'auth.error.twoFactorAttemptMax',
            });

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.enableTwoFactorInTx
            ).not.toHaveBeenCalled();
        });

        it('enables on one transaction opened after the setup code is verified', async () => {
            await useCase.execute(requestContext, apiKeyContext, dto);

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userTwoFactorService.checkSetupCode).toHaveBeenCalledBefore(
                outboxService.withTransaction
            );
        });

        it('answers AuthTwoFactorSetupRequiredException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSetupRequired,
                messagePath: 'auth.error.twoFactorSetupRequired',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('rethrows an AppBaseException of the transaction as it is', async () => {
            const failure = new AuthTwoFactorAttemptMaxException();
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);
            expect(databaseUtil.toException).not.toHaveBeenCalled();
        });

        it('wraps an unknown transaction error in AppUnknownException', async () => {
            const cause = new Error('boom');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });

        it('enables nothing when the setup code is wrong', async () => {
            const failure = new Error('invalid code');
            userTwoFactorService.checkSetupCode.mockRejectedValue(failure);

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);

            expect(
                userTwoFactorService.enableTwoFactorInTx
            ).not.toHaveBeenCalled();
        });
    });
});
