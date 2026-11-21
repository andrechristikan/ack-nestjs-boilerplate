import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumUserReauthenticationAction } from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import type {
    IUserMobileNumber,
    IUserReauthenticationCheck,
} from '@modules/user/interfaces/user.interface';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { UserDeleteMobileNumberUseCase } from '@modules/user/use-cases/user.delete-mobile-number.use-case';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';

const passkeyResponse = {
    id: 'AbC_-123',
    rawId: 'AbC_-123',
    response: {
        clientDataJSON: 'clientDataQuartz',
        authenticatorData: 'authenticatorDataQuartz',
        signature: 'signatureQuartz',
    },
    clientExtensionResults: {},
    type: 'public-key',
} as const;

describe('UserDeleteMobileNumberUseCase', () => {
    const userMobileNumberService: MockProxy<UserMobileNumberService> =
        mock<UserMobileNumberService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();

    let useCase: UserDeleteMobileNumberUseCase;

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const user = buildUser('user-swift', 'user-swift@example.com');
    const userContext = buildUserContext(user);
    const authContext = buildAuthJwtAccessContext(user.id);
    const tx = {} as IDatabaseTransactionClient;
    const passwordOnly: IUserReauthenticationCheck = {
        isPasswordChecked: true,
        mfa: null,
        verificationId: null,
        passkeyChallengeToken: null,
    };
    const mobileNumber: IUserMobileNumber = {
        id: 'mobile-swift',
        userId: 'user-swift',
        countryId: 'country-swift',
        phoneCode: '62',
        number: '81234567890',
        isVerified: false,
        verifiedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        country: {
            id: 'country-swift',
            name: 'Swift Coast',
            alpha2Code: 'SW',
            alpha3Code: 'SWL',
            phoneCode: ['62'],
            continent: 'Asia',
            timezone: 'UTC',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
        },
    };
    const dto = { password: 'Current-pass1' };

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userAuthService.assertReauthentication.mockResolvedValue(passwordOnly);
        userMobileNumberService.getOneMobileNumber.mockResolvedValue(
            mobileNumber
        );
        userMobileNumberService.deleteMobileNumberInTx.mockResolvedValue(
            mobileNumber
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserDeleteMobileNumberUseCase,
                {
                    provide: UserMobileNumberService,
                    useValue: userMobileNumberService,
                },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: DatabaseService, useValue: databaseService },
                DatabaseUtil,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();
        useCase = module.get(UserDeleteMobileNumberUseCase);
    });

    describe('execute', () => {
        it('asserts the re-authentication, gates on the row, then deletes on one transaction after completing it', async () => {
            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    mobileNumber.id,
                    dto
                )
            ).resolves.toEqual({ data: mobileNumber });

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.mobileNumberDelete,
                    password: 'Current-pass1',
                    method: null,
                    code: null,
                    backupCode: null,
                    passkeyChallengeToken: null,
                    passkeyResponse: null,
                    otp: null,
                }
            );
            expect(
                userMobileNumberService.getOneMobileNumber
            ).toHaveBeenCalledWith('user-swift', mobileNumber.id);
            expect(
                userMobileNumberService.getOneMobileNumber
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                passwordOnly
            );
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledBefore(
                userMobileNumberService.deleteMobileNumberInTx
            );
            expect(
                userMobileNumberService.deleteMobileNumberInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                mobileNumber.id
            );
        });

        it('passes the MFA and email-code fields of the request on', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                mobileNumber.id,
                {
                    ...dto,
                    method: EnumMfaMethod.totp,
                    code: '654321',
                    backupCode: 'BACKUP1',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '123456',
                }
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.mobileNumberDelete,
                    password: 'Current-pass1',
                    method: EnumMfaMethod.totp,
                    code: '654321',
                    backupCode: 'BACKUP1',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '123456',
                }
            );
        });

        it('passes null for every re-authentication field the request omits', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                mobileNumber.id,
                {}
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.mobileNumberDelete,
                    password: null,
                    method: null,
                    code: null,
                    backupCode: null,
                    passkeyChallengeToken: null,
                    passkeyResponse: null,
                    otp: null,
                }
            );
        });

        it('leaves the work undone when the re-authentication fails', async () => {
            const failure = new UserPasswordNotMatchException();
            userAuthService.assertReauthentication.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    mobileNumber.id,
                    dto
                )
            ).rejects.toBe(failure);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                userMobileNumberService.deleteMobileNumberInTx
            ).not.toHaveBeenCalled();
        });

        it('opens no transaction when the row is missing', async () => {
            const failure = new UserMobileNumberNotFoundException();
            userMobileNumberService.getOneMobileNumber.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    mobileNumber.id,
                    dto
                )
            ).rejects.toBe(failure);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('answers UserMobileNumberNotFoundException on a write conflict', async () => {
            const conflict = buildPrismaKnownRequestError('P2034');
            databaseService.withTransaction.mockRejectedValue(conflict);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    mobileNumber.id,
                    dto
                )
            ).rejects.toBeInstanceOf(UserMobileNumberNotFoundException);
        });

        it('rethrows an AppBaseException of the transaction as it is', async () => {
            const failure = new MfaInvalidException();
            userAuthService.completeReauthenticationInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    mobileNumber.id,
                    dto
                )
            ).rejects.toBe(failure);
        });

        it('wraps an unknown error of the transaction in AppUnknownException', async () => {
            const cause = new Error('boom');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    mobileNumber.id,
                    dto
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
