import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Country } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserService } from '@modules/user/services/user.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';

describe('UserMobileNumberService', () => {
    const userMobileNumberRepository: MockProxy<UserMobileNumberRepository> =
        mock<UserMobileNumberRepository>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-marlin', 'user-marlin@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const entry = buildActivityLogCreateManyEffect('activityLog');

    let service: UserMobileNumberService;

    const tx = {} as IDatabaseTransactionClient;
    const country: Country = {
        id: 'country-marlin',
        name: 'Marlin Coast',
        alpha2Code: 'ML',
        alpha3Code: 'MLD',
        phoneCode: ['+1'],
        continent: 'Atlantis',
        timezone: 'UTC',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const mobileNumber: IUserMobileNumber = {
        id: 'mobile-marlin',
        userId: 'user-marlin',
        countryId: country.id,
        phoneCode: '+1',
        number: '5551234',
        isVerified: false,
        verifiedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        country,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        activityLogService.recordEffect.mockReturnValue(entry);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserMobileNumberService,
                {
                    provide: UserMobileNumberRepository,
                    useValue: userMobileNumberRepository,
                },
                { provide: UserService, useValue: userService },
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        service = module.get(UserMobileNumberService);
    });

    describe('existsMobileNumber', () => {
        const input = {
            number: '5551234',
            countryId: country.id,
            phoneCode: '+1',
        };

        it('checks the number against all rows of the user when no row is excluded', async () => {
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                true
            );

            await expect(
                service.existsMobileNumber('user-marlin', input, null)
            ).resolves.toBe(true);
            expect(
                userMobileNumberRepository.existsMobileNumber
            ).toHaveBeenCalledWith('user-marlin', input, null);
        });

        it('excludes the row being updated', async () => {
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );

            await expect(
                service.existsMobileNumber('user-marlin', input, 'mobile-1')
            ).resolves.toBe(false);
            expect(
                userMobileNumberRepository.existsMobileNumber
            ).toHaveBeenCalledWith('user-marlin', input, 'mobile-1');
        });
    });

    describe('addMobileNumberInTx', () => {
        const input = {
            number: '5551234',
            countryId: country.id,
            phoneCode: '+1',
        };

        it('adds the mobile number, touches the user, and adds the entry on the given tx', async () => {
            userMobileNumberRepository.addInTx.mockResolvedValue(mobileNumber);

            const result = await service.addMobileNumberInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                input,
                country.phoneCode,
                false
            );

            expect(result).toBe(mobileNumber);
            expect(userMobileNumberRepository.addInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin',
                input
            );
            expect(userService.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userAddMobileNumber }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberInvalidException when the phone code does not match the country', async () => {
            await expect(
                service.addMobileNumberInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    { ...input, phoneCode: '+99' },
                    country.phoneCode,
                    false
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberInvalid,
            });
            expect(userMobileNumberRepository.addInTx).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberExistException when the mobile number already exists', async () => {
            await expect(
                service.addMobileNumberInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    input,
                    country.phoneCode,
                    true
                )
            ).rejects.toBeInstanceOf(UserMobileNumberExistException);
            expect(userMobileNumberRepository.addInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('getOneMobileNumber', () => {
        it('returns the mobile number of the user', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await expect(
                service.getOneMobileNumber('user-marlin', mobileNumber.id)
            ).resolves.toBe(mobileNumber);
            expect(
                userMobileNumberRepository.findOneMobileNumber
            ).toHaveBeenCalledWith('user-marlin', mobileNumber.id);
        });

        it('throws UserMobileNumberNotFoundException when the mobile number does not exist', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                null
            );

            await expect(
                service.getOneMobileNumber('user-marlin', 'missing')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberNotFound
                    ],
                messagePath: 'user.error.mobileNumberNotFound',
            });
        });
    });

    describe('updateMobileNumberInTx', () => {
        const input = {
            number: mobileNumber.number,
            countryId: country.id,
            phoneCode: mobileNumber.phoneCode,
        };

        it('updates the mobile number keeping verification when number and phone code are unchanged', async () => {
            const verified = { ...mobileNumber, isVerified: true };
            userMobileNumberRepository.updateInTx.mockResolvedValue(verified);

            const result = await service.updateMobileNumberInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                verified,
                input,
                country.phoneCode,
                false
            );

            expect(result).toBe(verified);
            expect(userMobileNumberRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin',
                mobileNumber.id,
                input,
                true
            );
            expect(userService.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userUpdateMobileNumber }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userVerificationService.expireActiveByMobileNumberInTx
            ).not.toHaveBeenCalled();
        });

        it('resets verification and expires the number active codes on the same tx when the digits change', async () => {
            userMobileNumberRepository.updateInTx.mockResolvedValue(
                mobileNumber
            );

            await service.updateMobileNumberInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                { ...mobileNumber, isVerified: true },
                { ...input, number: '5559999' },
                country.phoneCode,
                false
            );

            expect(userMobileNumberRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin',
                mobileNumber.id,
                { ...input, number: '5559999' },
                false
            );
            expect(
                userVerificationService.expireActiveByMobileNumberInTx
            ).toHaveBeenCalledWith(tx, mobileNumber.id);
        });

        it('expires the number active codes on the same tx when the phone code changes', async () => {
            userMobileNumberRepository.updateInTx.mockResolvedValue(
                mobileNumber
            );

            await service.updateMobileNumberInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                mobileNumber,
                { ...input, phoneCode: '+99' },
                ['+99'],
                false
            );

            expect(
                userVerificationService.expireActiveByMobileNumberInTx
            ).toHaveBeenCalledWith(tx, mobileNumber.id);
        });

        it('throws UserMobileNumberNotFoundException when the guarded update misses', async () => {
            userMobileNumberRepository.updateInTx.mockResolvedValue(null);

            await expect(
                service.updateMobileNumberInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    mobileNumber,
                    input,
                    country.phoneCode,
                    false
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
            });
            expect(userService.touchUpdatedByInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(
                userVerificationService.expireActiveByMobileNumberInTx
            ).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberExistException when another row already has the number', async () => {
            await expect(
                service.updateMobileNumberInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    mobileNumber,
                    input,
                    country.phoneCode,
                    true
                )
            ).rejects.toBeInstanceOf(UserMobileNumberExistException);
            expect(
                userMobileNumberRepository.updateInTx
            ).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberInvalidException when the phone code does not match the country', async () => {
            await expect(
                service.updateMobileNumberInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    mobileNumber,
                    { ...input, phoneCode: '+99' },
                    country.phoneCode,
                    false
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberInvalid,
            });
            expect(
                userMobileNumberRepository.updateInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('deleteMobileNumberInTx', () => {
        it('deletes the mobile number, touches the user, and adds the entry on the given tx', async () => {
            userMobileNumberRepository.deleteInTx.mockResolvedValue(
                mobileNumber
            );

            const result = await service.deleteMobileNumberInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                mobileNumber.id
            );

            expect(result).toBe(mobileNumber);
            expect(userMobileNumberRepository.deleteInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin',
                mobileNumber.id
            );
            expect(userService.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userDeleteMobileNumber }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userVerificationService.expireActiveByMobileNumberInTx
            ).toHaveBeenCalledWith(tx, mobileNumber.id);
        });

        it('throws UserMobileNumberNotFoundException when the guarded delete misses', async () => {
            userMobileNumberRepository.deleteInTx.mockResolvedValue(null);

            await expect(
                service.deleteMobileNumberInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    mobileNumber.id
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
            });
            expect(userService.touchUpdatedByInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(
                userVerificationService.expireActiveByMobileNumberInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('getOneUnverifiedMobileNumber', () => {
        it('returns the unverified mobile number of the user', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await expect(
                service.getOneUnverifiedMobileNumber(
                    'user-marlin',
                    mobileNumber.id
                )
            ).resolves.toBe(mobileNumber);
        });

        it('throws UserMobileNumberNotFoundException before any verified check', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                null
            );

            await expect(
                service.getOneUnverifiedMobileNumber('user-marlin', 'missing')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
            });
        });

        it('throws UserMobileNumberAlreadyVerifiedException for a verified number', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue({
                ...mobileNumber,
                isVerified: true,
            });

            await expect(
                service.getOneUnverifiedMobileNumber(
                    'user-marlin',
                    mobileNumber.id
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberAlreadyVerified,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberAlreadyVerified
                    ],
                messagePath: 'user.error.mobileNumberAlreadyVerified',
            });
        });
    });

    describe('markVerifiedInTx', () => {
        const verifiedAt = new Date('2026-03-01T00:00:00.000Z');

        it('marks the number verified at now on the given tx', async () => {
            helperDateService.create.mockReturnValue(verifiedAt);
            userMobileNumberRepository.markVerifiedInTx.mockResolvedValue(true);

            await service.markVerifiedInTx(tx, 'user-marlin', mobileNumber.id);

            expect(
                userMobileNumberRepository.markVerifiedInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-marlin',
                mobileNumber.id,
                verifiedAt
            );
        });

        it('throws UserTokenInvalidException when the guard is lost', async () => {
            helperDateService.create.mockReturnValue(verifiedAt);
            userMobileNumberRepository.markVerifiedInTx.mockResolvedValue(
                false
            );

            await expect(
                service.markVerifiedInTx(tx, 'user-marlin', mobileNumber.id)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
            });
        });
    });

    describe('toDialableNumber', () => {
        it('joins the plus sign, the phone code, and the number', () => {
            expect(
                service.toDialableNumber({
                    ...mobileNumber,
                    phoneCode: '62',
                    number: '81234',
                })
            ).toBe('+6281234');
        });
    });

    describe('removeByUserInTx', () => {
        it('deletes every mobile number of the user on the given transaction', async () => {
            await service.removeByUserInTx(tx, 'user-marlin');

            expect(
                userMobileNumberRepository.deleteByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-marlin');
        });
    });

    describe('checkMobileNumber', () => {
        it('returns true when the phone code belongs to the country', () => {
            expect(service['checkMobileNumber'](['+1', '+44'], '+1')).toBe(
                true
            );
        });

        it('returns false when the phone code does not belong to the country', () => {
            expect(service['checkMobileNumber'](['+1', '+44'], '+33')).toBe(
                false
            );
        });
    });
});
