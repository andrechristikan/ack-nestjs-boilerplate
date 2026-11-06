import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { Verification } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import type {
    IUser,
    IUserVerificationCreate,
} from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';

describe('UserVerificationDomain', () => {
    const userVerificationRepository: MockProxy<UserVerificationRepository> =
        mock<UserVerificationRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userVerificationUtil: MockProxy<UserVerificationUtil> =
        mock<UserVerificationUtil>({ verificationResendInMinutes: 7 });

    let domain: UserVerificationDomain;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');

    const baseUser: IUser = {
        id: 'user-flint',
        name: 'Flint Ashford',
        username: 'flintAshford',
        isVerified: false,
        verifiedAt: null,
        email: 'flint@example.com',
        roleId: 'role-flint',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-flint',
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
            id: 'role-flint',
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

    const verification: Verification = {
        id: 'verification-flint',
        userId: 'user-flint',
        mobileNumberId: null,
        to: 'flint@example.com',
        type: EnumVerificationType.email,
        token: 'hashed-token',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        verifiedAt: null,
        isUsed: false,
        reference: 'VRF-flint',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        createdBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        userRepository.findOneById.mockResolvedValue(baseUser);
        userRepository.markVerifiedInTx.mockResolvedValue(baseUser);
        userVerificationRepository.markUsedInTx.mockResolvedValue(true);

        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserVerificationDomain,
                {
                    provide: UserVerificationRepository,
                    useValue: userVerificationRepository,
                },
                { provide: UserRepository, useValue: userRepository },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationUtil,
                    useValue: userVerificationUtil,
                },
            ],
        }).compile();
        domain = module.get(UserVerificationDomain);
    });

    describe('getOneActiveByEmailToken', () => {
        it('returns the active verification of the hashed token with its user', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                verification
            );

            await expect(
                domain.getOneActiveByEmailToken('raw-token')
            ).resolves.toEqual({ verification, user: baseUser });

            expect(
                userVerificationRepository.findOneActiveByVerificationEmailToken
            ).toHaveBeenCalledWith('hashed-token');
            expect(userRepository.findOneById).toHaveBeenCalledWith(
                verification.userId
            );
        });

        it('returns the verification of an inactive user too', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                verification
            );
            const inactiveUser = {
                ...baseUser,
                status: EnumUserStatus.inactive,
            };
            userRepository.findOneById.mockResolvedValue(inactiveUser);

            await expect(
                domain.getOneActiveByEmailToken('raw-token')
            ).resolves.toEqual({ verification, user: inactiveUser });
            expect(userRepository.findOneActiveById).not.toHaveBeenCalled();
        });

        it('throws UserTokenInvalidException when the token is unknown', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                null
            );

            await expect(
                domain.getOneActiveByEmailToken('raw-token')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.tokenInvalid
                    ],
                messagePath: 'user.error.verificationTokenInvalid',
            });
        });

        it('throws UserEmailAlreadyVerifiedException when the user is already verified', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                verification
            );
            userRepository.findOneById.mockResolvedValue({
                ...baseUser,
                isVerified: true,
            });

            await expect(
                domain.getOneActiveByEmailToken('raw-token')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailAlreadyVerified,
                messagePath: 'user.error.emailAlreadyVerified',
            });
        });

        it('throws UserNotFoundException when the verified user is gone', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                verification
            );
            userRepository.findOneById.mockResolvedValue(null);

            await expect(
                domain.getOneActiveByEmailToken('raw-token')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
            });
        });
    });

    describe('verifyEmail', () => {
        it('marks the verification and the user verified in one transaction', async () => {
            await domain.verifyEmail(verification);

            expect(
                userVerificationRepository.markUsedInTx
            ).toHaveBeenCalledWith(tx, verification.id, now);
            expect(userRepository.markVerifiedInTx).toHaveBeenCalledWith(
                tx,
                verification.userId,
                now
            );
        });

        it('throws UserTokenInvalidException when the token was already used', async () => {
            userVerificationRepository.markUsedInTx.mockResolvedValue(false);

            const call = domain.verifyEmail(verification);

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                messagePath: 'user.error.verificationTokenInvalid',
            });
            expect(userRepository.markVerifiedInTx).not.toHaveBeenCalled();
        });

        it('maps a write conflict to UserTokenInvalidException', async () => {
            const conflict = new Error('write-conflict');
            userVerificationRepository.markUsedInTx.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            const call = domain.verifyEmail(verification);

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            const error = new UserNotFoundException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.verifyEmail(verification);

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.verifyEmail(verification);

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('getOneForResendByEmail', () => {
        it('returns the user when there is no previous verification', async () => {
            const user: IUser = { ...baseUser, isVerified: false };
            userRepository.findOneActiveByEmail.mockResolvedValue(user);
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                null
            );

            await expect(
                domain.getOneForResendByEmail('flint@example.com')
            ).resolves.toBe(user);

            expect(userUtil.getResendWaitInMinutes).not.toHaveBeenCalled();
        });

        it('returns the user when the previous verification is past its resend window', async () => {
            const user: IUser = { ...baseUser, isVerified: false };
            userRepository.findOneActiveByEmail.mockResolvedValue(user);
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                verification
            );
            userUtil.getResendWaitInMinutes.mockReturnValue(null);

            await expect(
                domain.getOneForResendByEmail('flint@example.com')
            ).resolves.toBe(user);

            expect(userUtil.getResendWaitInMinutes).toHaveBeenCalledWith(
                verification.createdAt,
                7
            );
        });

        it('returns null when no active user holds the email', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(null);

            await expect(
                domain.getOneForResendByEmail('missing@example.com')
            ).resolves.toBeNull();

            expect(
                userVerificationRepository.findOneLatestByVerificationEmail
            ).not.toHaveBeenCalled();
        });

        it('returns null when the user is already verified', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue({
                ...baseUser,
                isVerified: true,
            });

            await expect(
                domain.getOneForResendByEmail('flint@example.com')
            ).resolves.toBeNull();

            expect(
                userVerificationRepository.findOneLatestByVerificationEmail
            ).not.toHaveBeenCalled();
        });

        it('throws UserVerificationEmailResendLimitExceededException when resent too soon', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue({
                ...baseUser,
                isVerified: false,
            });
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                verification
            );
            userUtil.getResendWaitInMinutes.mockReturnValue(5);

            await expect(
                domain.getOneForResendByEmail('flint@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.verificationEmailResendLimitExceeded,
                messagePath: 'user.error.verificationEmailResendLimitExceeded',
                messageProperties: { minutes: 5 },
            });
        });
    });

    describe('markVerified', () => {
        it('marks the user verified', async () => {
            await domain.markVerified('user-flint');

            expect(userRepository.markVerified).toHaveBeenCalledWith(
                'user-flint',
                now
            );
        });
    });

    describe('persistVerificationEmail', () => {
        it('persists the verification replacing the active one', async () => {
            const emailVerification: IUserVerificationCreate = {
                reference: 'VRF-random-token',
                expiredAt: new Date('2026-03-05T00:00:00.000Z'),
                type: EnumVerificationType.email,
                token: 'random-token',
                hashedToken: 'hashed-token',
                expiredInMinutes: 15,
                link: 'https://example.com/verify?token=random-token',
                resendInMinutes: 5,
            };

            await domain.persistVerificationEmail(
                'user-flint',
                'flint@example.com',
                emailVerification
            );

            expect(
                userVerificationRepository.createReplacingActive
            ).toHaveBeenCalledWith(
                'user-flint',
                'flint@example.com',
                emailVerification,
                now
            );
        });
    });

    describe('createInTx', () => {
        it('delegates to the repository', async () => {
            const createVerification: IUserCreateVerification = {
                reference: 'VRF-create',
                token: 'hashed-token',
                type: EnumVerificationType.email,
                to: 'flint@example.com',
                expiredAt: new Date('2026-03-05T00:00:00.000Z'),
                verifiedAt: null,
                isUsed: false,
            };
            userVerificationRepository.createInTx.mockResolvedValue(
                verification
            );

            await expect(
                domain.createInTx(
                    tx,
                    'user-flint',
                    createVerification,
                    'admin-flint'
                )
            ).resolves.toBe(verification);
            expect(userVerificationRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-flint',
                createVerification,
                'admin-flint'
            );
        });
    });
});
