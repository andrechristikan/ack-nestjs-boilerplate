import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumUserReauthenticationAction } from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';
import { CountryService } from '@modules/country/services/country.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
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
import { UserUpdateMobileNumberUseCase } from '@modules/user/use-cases/user.update-mobile-number.use-case';

describe('UserUpdateMobileNumberUseCase', () => {
    const userMobileNumberService: MockProxy<UserMobileNumberService> =
        mock<UserMobileNumberService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const countryService: MockProxy<CountryService> = mock<CountryService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let useCase: UserUpdateMobileNumberUseCase;

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const user = buildUser('user-swift', 'user-swift@example.com');
    const userContext = buildUserContext(user);
    const authContext = buildAuthJwtAccessContext(user.id);
    const tx = {} as IDatabaseTransactionClient;
    const passwordOnly: IUserReauthenticationCheck = {
        isPasswordChecked: true,
        twoFactor: null,
        verificationId: null,
    };
    const withTwoFactor: IUserReauthenticationCheck = {
        isPasswordChecked: true,
        twoFactor: {
            verified: {
                method: EnumAuthTwoFactorMethod.code,
                newBackupCodes: null,
            },
            totpStep: 7,
        },
        verificationId: null,
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
        vi.resetAllMocks();
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userAuthService.assertReauthentication.mockResolvedValue(passwordOnly);
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
                { provide: CountryService, useValue: countryService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserUpdateMobileNumberUseCase);
    });

    describe('execute', () => {
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

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.mobileNumberUpdate,
                    password: 'Current-pass1',
                    method: null,
                    code: null,
                    backupCode: null,
                    otp: null,
                }
            );
            expect(
                userAuthService.assertReauthentication
            ).toHaveBeenCalledBefore(outboxService.withTransaction);
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                user,
                passwordOnly
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
                numberInput,
                mobileNumber.country.phoneCode,
                false
            );
            expect(countryService.getOne).toHaveBeenCalledWith('country-swift');
            expect(
                userMobileNumberService.existsMobileNumber
            ).toHaveBeenCalledWith('user-swift', numberInput, mobileNumber.id);
        });

        it('passes the two-factor and email-code fields of the request on', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                mobileNumber.id,
                {
                    ...dto,
                    method: EnumAuthTwoFactorMethod.code,
                    code: '654321',
                    backupCode: 'BACKUP1',
                    otp: '123456',
                }
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.mobileNumberUpdate,
                    password: 'Current-pass1',
                    method: EnumAuthTwoFactorMethod.code,
                    code: '654321',
                    backupCode: 'BACKUP1',
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
                numberInput
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.mobileNumberUpdate,
                    password: null,
                    method: null,
                    code: null,
                    backupCode: null,
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

            expect(countryService.getOne).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
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
            ).rejects.toBeInstanceOf(CountryNotFoundException);

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('maps a number collision to UserMobileNumberExistException', async () => {
            const collision = new Error('unique');
            outboxService.withTransaction.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    mobileNumber.id,
                    dto
                )
            ).rejects.toBeInstanceOf(UserMobileNumberExistException);
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'number'
            );
        });

        it('rethrows an AppBaseException of the transaction as it is', async () => {
            const failure = new AuthTwoFactorInvalidException();
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
            expect(databaseUtil.isUniqueCollision).not.toHaveBeenCalled();
        });

        it('answers AuthTwoFactorInvalidException on a write conflict when a two-factor proof was checked', async () => {
            userAuthService.assertReauthentication.mockResolvedValue(
                withTwoFactor
            );
            outboxService.withTransaction.mockRejectedValue(
                new Error('write conflict')
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
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
                module: 'auth',
                messagePath: 'auth.error.twoFactorInvalid',
            });
        });

        it('wraps a write conflict in AppUnknownException when no two-factor proof was checked', async () => {
            outboxService.withTransaction.mockRejectedValue(
                new Error('write conflict')
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
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
            ).rejects.toBeInstanceOf(AppUnknownException);
        });

        it('wraps an unknown error of the transaction in AppUnknownException', async () => {
            const cause = new Error('boom');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(null);

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
