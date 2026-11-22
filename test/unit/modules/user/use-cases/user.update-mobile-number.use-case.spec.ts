import { setImmediate } from 'node:timers/promises';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { Test } from '@nestjs/testing';
import {
    TestUnitReauthenticationMfaFailure,
    TestUnitReauthenticationMfaOff,
    TestUnitReauthenticationPasswordLimit,
    TestUnitReauthenticationPasswordPassed,
} from '@test/unit/helpers/test.unit.user.helper';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumUserReauthenticationAction } from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { CountryService } from '@modules/country/services/country.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import { UserMobileNumberInvalidException } from '@modules/user/exceptions/user.mobile-number-invalid.exception';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import type { IMfaReauthenticationResult } from '@modules/mfa/interfaces/mfa.interface';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { UserUpdateMobileNumberUseCase } from '@modules/user/use-cases/user.update-mobile-number.use-case';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
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

describe('UserUpdateMobileNumberUseCase', () => {
    const userMobileNumberService: MockProxy<UserMobileNumberService> =
        mock<UserMobileNumberService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const countryService: MockProxy<CountryService> = mock<CountryService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();

    let useCase: UserUpdateMobileNumberUseCase;

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const user = buildUser('user-swift', 'user-swift@example.com');
    const userContext = buildUserContext(user);
    const authContext = buildAuthJwtAccessContext(user.id);
    const tx = {} as IDatabaseTransactionClient;
    const withMfa: IMfaReauthenticationResult = {
        isEnabled: true,
        check: {
            method: EnumMfaMethod.totp,
            totpStep: 7,
            backupCodeHash: null,
            passkey: null,
        },
        failure: null,
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
    const numberInput = {
        number: '81234567890',
        countryId: 'country-swift',
        phoneCode: '62',
    };
    const dto = {
        ...numberInput,
        password: 'Current-pass1',
    };

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userAuthService.checkReauthenticationPassword.mockResolvedValue(
            TestUnitReauthenticationPasswordPassed
        );
        mfaService.checkReauthentication.mockResolvedValue(
            TestUnitReauthenticationMfaOff
        );
        userAuthService.getReauthenticationVerificationId.mockResolvedValue(
            null
        );
        countryService.getOne.mockResolvedValue(mobileNumber.country);
        userMobileNumberService.existsMobileNumber.mockResolvedValue(false);
        userMobileNumberService.updateMobileNumberInTx.mockResolvedValue(
            mobileNumber
        );
        userMobileNumberService.getOneMobileNumber.mockResolvedValue(
            mobileNumber
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserUpdateMobileNumberUseCase,
                {
                    provide: UserMobileNumberService,
                    useValue: userMobileNumberService,
                },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: MfaService, useValue: mfaService },
                { provide: CountryService, useValue: countryService },
                { provide: DatabaseService, useValue: databaseService },
                DatabaseUtil,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();
        useCase = module.get(UserUpdateMobileNumberUseCase);
    });

    describe('execute', () => {
        it('commits the failed count in a transaction of its own, then throws, and leaves the work undone', async () => {
            const refusal = new Error('refused');
            userAuthService.checkReauthenticationPassword.mockResolvedValue({
                isPasswordChecked: true,
                limit: TestUnitReauthenticationPasswordLimit,
            });
            userAuthService.countFailedReauthenticationInTx.mockResolvedValue(
                true
            );
            userAuthService.throwFailedReauthentication.mockImplementation(
                () => {
                    throw refusal;
                }
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
            ).rejects.toBe(refusal);

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userAuthService.countFailedReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                TestUnitReauthenticationPasswordLimit
            );
            expect(
                userAuthService.countFailedReauthenticationInTx
            ).toHaveBeenCalledBefore(
                userAuthService.throwFailedReauthentication
            );
            expect(
                userAuthService.throwFailedReauthentication
            ).toHaveBeenCalledWith(true);
            expect(
                userAuthService.completeReauthenticationInTx
            ).not.toHaveBeenCalled();
            expect(mfaService.checkReauthentication).not.toHaveBeenCalled();
        });

        it('commits the failed MFA count in a transaction of its own, then throws, and leaves the work undone', async () => {
            const refusal = new Error('refused');
            mfaService.checkReauthentication.mockResolvedValue({
                isEnabled: true,
                check: null,
                failure: TestUnitReauthenticationMfaFailure,
                passkeyChallengeToken: null,
            });
            mfaService.countFailedAttemptInTx.mockResolvedValue(true);
            mfaService.throwFailedAttempt.mockImplementation(() => {
                throw refusal;
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    mobileNumber.id,
                    dto
                )
            ).rejects.toBe(refusal);

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(mfaService.countFailedAttemptInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext.userId,
                TestUnitReauthenticationMfaFailure
            );
            expect(mfaService.countFailedAttemptInTx).toHaveBeenCalledBefore(
                mfaService.throwFailedAttempt
            );
            expect(mfaService.throwFailedAttempt).toHaveBeenCalledWith(
                TestUnitReauthenticationMfaFailure,
                true
            );
            expect(
                userAuthService.getReauthenticationVerificationId
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.completeReauthenticationInTx
            ).not.toHaveBeenCalled();
            expect(
                mfaService.completeReauthenticationInTx
            ).not.toHaveBeenCalled();
        });

        it('asserts the re-authentication first, then writes on one transaction after completing it', async () => {
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

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mobileNumberUpdate,
                password: 'Current-pass1',
                method: null,
                code: null,
                backupCode: null,
                passkeyChallengeToken: null,
                passkeyResponse: null,
                otp: null,
            });
            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(tx, authContext, true, null);
            expect(
                mfaService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                TestUnitReauthenticationMfaOff
            );
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledBefore(
                userMobileNumberService.updateMobileNumberInTx
            );
            expect(
                userMobileNumberService.updateMobileNumberInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                mobileNumber,
                numberInput
            );
            expect(countryService.getOne).toHaveBeenCalledWith('country-swift');
            expect(
                userMobileNumberService.existsMobileNumber
            ).toHaveBeenCalledWith('user-swift', numberInput, mobileNumber.id);
            expect(
                userMobileNumberService.assertMobileNumberAllowed
            ).toHaveBeenCalledWith(
                mobileNumber.country.phoneCode,
                numberInput.phoneCode,
                false
            );
            expect(
                userMobileNumberService.assertMobileNumberAllowed
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
        });

        it("throws UserMobileNumberInvalidException with withTransaction not called when the phone code is not the country's", async () => {
            userMobileNumberService.assertMobileNumberAllowed.mockImplementation(
                () => {
                    throw new UserMobileNumberInvalidException();
                }
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
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberInvalid,
            });

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('reads the country and the duplicate check while the number read is still pending', async () => {
            const numberRead = buildDeferred<typeof mobileNumber>();
            userMobileNumberService.getOneMobileNumber.mockReturnValue(
                numberRead.promise
            );

            const running = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                mobileNumber.id,
                dto
            );
            await setImmediate();

            expect(countryService.getOne).toHaveBeenCalledWith(
                numberInput.countryId
            );
            expect(
                userMobileNumberService.existsMobileNumber
            ).toHaveBeenCalledWith(
                authContext.userId,
                numberInput,
                mobileNumber.id
            );

            numberRead.resolve(mobileNumber);
            await running;
        });

        it('throws UserMobileNumberExistException with withTransaction not called when the number is a duplicate', async () => {
            userMobileNumberService.existsMobileNumber.mockResolvedValue(true);
            userMobileNumberService.assertMobileNumberAllowed.mockImplementation(
                () => {
                    throw new UserMobileNumberExistException();
                }
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
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
            });

            expect(
                userMobileNumberService.assertMobileNumberAllowed
            ).toHaveBeenCalledWith(
                mobileNumber.country.phoneCode,
                numberInput.phoneCode,
                true
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
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

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mobileNumberUpdate,
                password: 'Current-pass1',
                method: EnumMfaMethod.totp,
                code: '654321',
                backupCode: 'BACKUP1',
                passkeyChallengeToken: 'challenge-quartz',
                passkeyResponse,
                otp: '123456',
            });
        });

        it('passes null for every re-authentication field the request omits', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                mobileNumber.id,
                numberInput
            );

            expect(
                userAuthService.checkReauthenticationPassword
            ).toHaveBeenCalledWith(user, {
                action: EnumUserReauthenticationAction.mobileNumberUpdate,
                password: null,
                method: null,
                code: null,
                backupCode: null,
                passkeyChallengeToken: null,
                passkeyResponse: null,
                otp: null,
            });
        });

        it('leaves the work undone when the re-authentication fails', async () => {
            const failure = new UserPasswordNotMatchException();
            userAuthService.checkReauthenticationPassword.mockRejectedValue(
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

            expect(countryService.getOne).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                userMobileNumberService.updateMobileNumberInTx
            ).not.toHaveBeenCalled();
        });

        it('writes nothing when the country is missing', async () => {
            countryService.getOne.mockRejectedValue(
                new CountryNotFoundException()
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
            ).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
            });

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('maps a number collision to UserMobileNumberExistException', async () => {
            const collision = buildPrismaKnownRequestError('P2002', 'number');
            databaseService.withTransaction.mockRejectedValue(collision);

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
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
            });
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

            expect(
                userMobileNumberService.updateMobileNumberInTx
            ).not.toHaveBeenCalled();
        });

        it('answers MfaInvalidException on a write conflict when a MFA proof was checked', async () => {
            mfaService.checkReauthentication.mockResolvedValue(withMfa);
            databaseService.withTransaction.mockRejectedValue(
                buildPrismaKnownRequestError('P2034')
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
            ).rejects.toMatchObject({
                statusCode: EnumMfaStatusCodeError.invalid,

                module: 'mfa',
            });
        });

        it('wraps a write conflict in AppUnknownException when no MFA proof was checked', async () => {
            databaseService.withTransaction.mockRejectedValue(
                buildPrismaKnownRequestError('P2034')
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
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
            });
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
