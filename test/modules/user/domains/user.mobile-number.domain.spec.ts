import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { EnumVerificationType } from '@generated/prisma-client/client';
import type { Country, Verification } from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserMobileNumberDomain } from '@modules/user/domains/user.mobile-number.domain';
import { UserMobileNumberAlreadyVerifiedException } from '@modules/user/exceptions/user.mobile-number-already-verified.exception';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
import { UserMobileNumberInvalidException } from '@modules/user/exceptions/user.mobile-number-invalid.exception';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';
import { UserMobileNumberOtpInvalidException } from '@modules/user/exceptions/user.mobile-number-otp-invalid.exception';
import { UserVerificationMobileNumberResendLimitExceededException } from '@modules/user/exceptions/user.verification-mobile-number-resend-limit-exceeded.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type {
    IUserMobileNumber,
    IUserMobileNumberVerificationCreate,
} from '@modules/user/interfaces/user.interface';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { DateTime, Duration } from 'luxon';

describe('UserMobileNumberDomain', () => {
    const userMobileNumberRepository: MockProxy<UserMobileNumberRepository> =
        mock<UserMobileNumberRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const countryDomain: MockProxy<CountryDomain> = mock<CountryDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userVerificationRepository: MockProxy<UserVerificationRepository> =
        mock<UserVerificationRepository>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let domain: UserMobileNumberDomain;

    const tx = {} as IDatabaseTransactionClient;
    const country: Country = {
        id: 'country-marlin',
        name: 'Marlin Coast',
        alpha2Code: 'ML',
        alpha3Code: 'MLD',
        phoneCode: ['+62'],
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
        phoneCode: '+62',
        number: '8123456789',
        isVerified: false,
        verifiedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        country,
    };
    const event: IActivityLogStagedEvent = {
        action: EnumActivityLogAction.userAddMobileNumber,
        metadata: {},
        onError: false,
    };
    const sendEvent: IActivityLogStagedEvent = {
        action: EnumActivityLogAction.userSendVerificationMobileNumber,
        metadata: {},
        onError: false,
    };
    const configValues: Record<string, string | number> = {
        'verification.reference.prefix': 'VRF',
        'verification.reference.length': 8,
        'verification.otpLength': 6,
        'verification.expiredInMs': 5 * 60 * 1000,
        'verification.resendInMs': 2 * 60 * 1000,
    };
    const now = new Date('2026-03-01T00:00:00.000Z');
    const expiredAt = new Date('2026-03-01T00:05:00.000Z');
    const expiredAtIso = '2026-03-01T00:05:00.000Z';
    const verificationCreate: IUserMobileNumberVerificationCreate = {
        otp: '123456',
        hashedOtp: 'hashed',
        reference: 'VRF-ABCDEFGH',
        expiredAt,
        expiredInMinutes: 5,
    };
    const latestVerification: Verification = {
        id: 'verification-marlin',
        userId: 'user-marlin',
        mobileNumberId: 'mobile-marlin',
        type: EnumVerificationType.mobileNumber,
        to: '+628123456789',
        token: 'hashed',
        reference: 'VRF-PREVIOUS',
        isUsed: false,
        verifiedAt: null,
        expiredAt: new Date('2026-03-01T00:04:00.000Z'),
        createdAt: new Date('2026-02-28T23:59:00.000Z'),
        createdBy: 'user-marlin',
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        activityLogDomain.prepare.mockImplementation(input =>
            input.action ===
            EnumActivityLogAction.userSendVerificationMobileNumber
                ? sendEvent
                : event
        );
        configGet.mockImplementation(key => configValues[key]);
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation((date, duration) =>
            DateTime.fromJSDate(date).plus(duration).toJSDate()
        );
        helperDateService.diff.mockImplementation((dateOne, dateTwo) =>
            DateTime.fromJSDate(dateOne).diff(DateTime.fromJSDate(dateTwo))
        );
        helperDateService.formatToIso.mockImplementation(date =>
            date.toISOString()
        );
        helperNumberService.randomDigits.mockReturnValue('123456');
        helperHashService.sha256Hash.mockReturnValue('hashed');
        helperStringService.random.mockReturnValue('ABCDEFGH');
        userVerificationRepository.findOneLatestMobileNumberByUser.mockResolvedValue(
            null
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserMobileNumberDomain,
                {
                    provide: UserMobileNumberRepository,
                    useValue: userMobileNumberRepository,
                },
                { provide: UserDomain, useValue: userDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: CountryDomain, useValue: countryDomain },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationRepository,
                    useValue: userVerificationRepository,
                },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperHashService, useValue: helperHashService },
                {
                    provide: HelperNumberService,
                    useValue: helperNumberService,
                },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        domain = module.get(UserMobileNumberDomain);
    });

    describe('isActiveVerification', () => {
        it('returns false when the queued code has expired or been used', async () => {
            userVerificationRepository.findOneActiveMobileNumber.mockResolvedValue(
                null
            );

            await expect(
                domain.isActiveVerification(
                    'user-marlin',
                    'mobile-marlin',
                    'VRF-PREVIOUS'
                )
            ).resolves.toBe(false);
        });

        it('returns false when a resend replaced the queued code', async () => {
            userVerificationRepository.findOneActiveMobileNumber.mockResolvedValue(
                { ...latestVerification, reference: 'VRF-NEW' }
            );

            await expect(
                domain.isActiveVerification(
                    'user-marlin',
                    'mobile-marlin',
                    'VRF-PREVIOUS'
                )
            ).resolves.toBe(false);
        });

        it('accepts the current active code', async () => {
            userVerificationRepository.findOneActiveMobileNumber.mockResolvedValue(
                latestVerification
            );

            await expect(
                domain.isActiveVerification(
                    'user-marlin',
                    'mobile-marlin',
                    'VRF-PREVIOUS'
                )
            ).resolves.toBe(true);
        });
    });

    describe('addMobileNumber', () => {
        it('rejects inside the cooldown before any write', async () => {
            countryDomain.getOne.mockResolvedValue(country);
            userUtil.checkMobileNumber.mockReturnValue(true);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );
            userVerificationRepository.findOneLatestMobileNumberByUser.mockResolvedValue(
                latestVerification
            );

            const call = domain.addMobileNumber('user-marlin', {
                number: '8123456789',
                countryId: country.id,
                phoneCode: '+62',
            });

            await expect(call).rejects.toBeInstanceOf(
                UserVerificationMobileNumberResendLimitExceededException
            );
            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.verificationMobileNumberResendLimitExceeded,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError
                            .verificationMobileNumberResendLimitExceeded
                    ],
                messagePath:
                    'user.error.verificationMobileNumberResendLimitExceeded',
                messageProperties: { resendIn: 1 },
            });
            expect(
                userVerificationRepository.findOneLatestMobileNumberByUser
            ).toHaveBeenCalledWith('user-marlin');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(userMobileNumberRepository.addInTx).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendVerificationMobileNumber
            ).not.toHaveBeenCalled();
        });

        it('looks up a duplicate number alongside the country lookup', async () => {
            const error = new Error('country lookup failed');
            countryDomain.getOne.mockRejectedValue(error);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );

            await expect(
                domain.addMobileNumber('user-marlin', {
                    number: '8123456789',
                    countryId: country.id,
                    phoneCode: '+62',
                })
            ).rejects.toBe(error);
            expect(
                userMobileNumberRepository.existsMobileNumber
            ).toHaveBeenCalledWith('user-marlin', {
                number: '8123456789',
                countryId: country.id,
                phoneCode: '+62',
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('creates the number and its verification in one transaction, then enqueues', async () => {
            countryDomain.getOne.mockResolvedValue(country);
            userUtil.checkMobileNumber.mockReturnValue(true);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );
            userVerificationRepository.findOneLatestMobileNumberByUser.mockResolvedValue(
                {
                    ...latestVerification,
                    createdAt: new Date('2026-02-28T23:58:00.000Z'),
                }
            );
            const callOrder: string[] = [];
            userMobileNumberRepository.addInTx.mockImplementation(async () => {
                callOrder.push('addInTx');
                return mobileNumber;
            });
            userVerificationRepository.createMobileNumberInTx.mockImplementation(
                async () => {
                    callOrder.push('createMobileNumberInTx');
                    return latestVerification;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendVerificationMobileNumber.mockImplementation(
                async () => {
                    callOrder.push('sendVerificationMobileNumber');
                }
            );

            const result = await domain.addMobileNumber('user-marlin', {
                number: '8123456789',
                countryId: country.id,
                phoneCode: '+62',
            });

            expect(result).toBe(mobileNumber);
            expect(userMobileNumberRepository.addInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin',
                {
                    number: '8123456789',
                    countryId: country.id,
                    phoneCode: '+62',
                }
            );
            expect(
                userVerificationRepository.createMobileNumberInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-marlin',
                mobileNumber.id,
                '+628123456789',
                {
                    hashedOtp: verificationCreate.hashedOtp,
                    reference: verificationCreate.reference,
                    expiredAt: verificationCreate.expiredAt,
                },
                now
            );
            expect(userDomain.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin'
            );
            expect(
                notificationQueue.sendVerificationMobileNumber
            ).toHaveBeenCalledWith('user-marlin', {
                mobileNumberId: mobileNumber.id,
                phoneNumber: '+628123456789',
                otp: '123456',
                expiredInMinutes: 5,
                expiredAt: expiredAtIso,
                reference: 'VRF-ABCDEFGH',
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userAddMobileNumber,
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSendVerificationMobileNumber,
                userId: 'user-marlin',
                createdBy: 'user-marlin',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
                sendEvent,
            ]);
            expect(callOrder).toEqual([
                'addInTx',
                'createMobileNumberInTx',
                'stagePrepared',
                'sendVerificationMobileNumber',
            ]);
        });

        it('surfaces AppUnknownException when enqueue fails, after commit', async () => {
            countryDomain.getOne.mockResolvedValue(country);
            userUtil.checkMobileNumber.mockReturnValue(true);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );
            userMobileNumberRepository.addInTx.mockResolvedValue(mobileNumber);
            const error = new Error('queue down');
            notificationQueue.sendVerificationMobileNumber.mockRejectedValue(
                error
            );

            const call = domain.addMobileNumber('user-marlin', {
                number: '8123456789',
                countryId: country.id,
                phoneCode: '+62',
            });

            await expect(call).rejects.toBeInstanceOf(AppUnknownException);
            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
            expect(userDomain.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
                sendEvent,
            ]);
        });

        it('throws UserMobileNumberInvalidException when the phone code does not match the country', async () => {
            countryDomain.getOne.mockResolvedValue(country);
            userUtil.checkMobileNumber.mockReturnValue(false);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );

            await expect(
                domain.addMobileNumber('user-marlin', {
                    number: '8123456789',
                    countryId: country.id,
                    phoneCode: '+9',
                })
            ).rejects.toThrow(UserMobileNumberInvalidException);
            await expect(
                domain.addMobileNumber('user-marlin', {
                    number: '8123456789',
                    countryId: country.id,
                    phoneCode: '+9',
                })
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberInvalid
                    ],
                messagePath: 'user.error.mobileNumberInvalid',
            });
        });

        it('throws UserMobileNumberExistException when the mobile number already exists', async () => {
            countryDomain.getOne.mockResolvedValue(country);
            userUtil.checkMobileNumber.mockReturnValue(true);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                true
            );

            await expect(
                domain.addMobileNumber('user-marlin', {
                    number: '8123456789',
                    countryId: country.id,
                    phoneCode: '+62',
                })
            ).rejects.toThrow(UserMobileNumberExistException);
            await expect(
                domain.addMobileNumber('user-marlin', {
                    number: '8123456789',
                    countryId: country.id,
                    phoneCode: '+62',
                })
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberExist
                    ],
                messagePath: 'user.error.mobileNumberExist',
            });
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            countryDomain.getOne.mockResolvedValue(country);
            userUtil.checkMobileNumber.mockReturnValue(true);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );
            const error = new UserMobileNumberExistException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.addMobileNumber('user-marlin', {
                number: '8123456789',
                countryId: country.id,
                phoneCode: '+62',
            });

            await expect(call).rejects.toBeInstanceOf(
                UserMobileNumberExistException
            );
            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberExist
                    ],
                messagePath: 'user.error.mobileNumberExist',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            countryDomain.getOne.mockResolvedValue(country);
            userUtil.checkMobileNumber.mockReturnValue(true);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.addMobileNumber('user-marlin', {
                number: '8123456789',
                countryId: country.id,
                phoneCode: '+62',
            });

            await expect(call).rejects.toBeInstanceOf(AppUnknownException);
            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('updateMobileNumber', () => {
        it('updates the mobile number, stages the event in order, keeping verification when number and phone code are unchanged', async () => {
            const verifiedAt = new Date('2026-01-03T00:00:00.000Z');
            const verified = { ...mobileNumber, isVerified: true, verifiedAt };
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                verified
            );
            countryDomain.getOne.mockResolvedValue(country);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );
            userUtil.checkMobileNumber.mockReturnValue(true);
            const callOrder: string[] = [];
            userMobileNumberRepository.updateInTx.mockImplementation(
                async () => {
                    callOrder.push('updateInTx');
                    return verified;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            const result = await domain.updateMobileNumber(
                'user-marlin',
                mobileNumber.id,
                {
                    number: mobileNumber.number,
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                }
            );

            expect(result).toBe(verified);
            expect(userMobileNumberRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                mobileNumber.id,
                {
                    number: mobileNumber.number,
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                },
                true,
                verifiedAt
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userUpdateMobileNumber,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(callOrder).toEqual(['updateInTx', 'stagePrepared']);
            expect(
                userVerificationRepository.findOneLatestMobileNumberByUser
            ).not.toHaveBeenCalled();
            expect(
                userVerificationRepository.expireActiveMobileNumberInTx
            ).not.toHaveBeenCalled();
            expect(
                userVerificationRepository.createMobileNumberInTx
            ).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendVerificationMobileNumber
            ).not.toHaveBeenCalled();
        });

        it('rejects a changed number inside the cooldown before any write', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            countryDomain.getOne.mockResolvedValue(country);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );
            userUtil.checkMobileNumber.mockReturnValue(true);
            userVerificationRepository.findOneLatestMobileNumberByUser.mockResolvedValue(
                latestVerification
            );

            const call = domain.updateMobileNumber(
                'user-marlin',
                mobileNumber.id,
                {
                    number: '8129999999',
                    countryId: country.id,
                    phoneCode: '+62',
                }
            );

            await expect(call).rejects.toBeInstanceOf(
                UserVerificationMobileNumberResendLimitExceededException
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendVerificationMobileNumber
            ).not.toHaveBeenCalled();
        });

        it('checks cooldown, resets verification, expires old codes and sends a new one when the number changes', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue({
                ...mobileNumber,
                isVerified: true,
                verifiedAt: new Date('2026-01-03T00:00:00.000Z'),
            });
            countryDomain.getOne.mockResolvedValue(country);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );
            userUtil.checkMobileNumber.mockReturnValue(true);
            const changed = { ...mobileNumber, number: '8129999999' };
            const callOrder: string[] = [];
            userMobileNumberRepository.updateInTx.mockImplementation(
                async () => {
                    callOrder.push('updateInTx');
                    return changed;
                }
            );
            userVerificationRepository.expireActiveMobileNumberInTx.mockImplementation(
                async () => {
                    callOrder.push('expireActiveMobileNumberInTx');
                }
            );
            userVerificationRepository.createMobileNumberInTx.mockImplementation(
                async () => {
                    callOrder.push('createMobileNumberInTx');
                    return latestVerification;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendVerificationMobileNumber.mockImplementation(
                async () => {
                    callOrder.push('sendVerificationMobileNumber');
                }
            );

            const result = await domain.updateMobileNumber(
                'user-marlin',
                mobileNumber.id,
                {
                    number: '8129999999',
                    countryId: country.id,
                    phoneCode: '+62',
                }
            );

            expect(result).toBe(changed);
            expect(
                userVerificationRepository.findOneLatestMobileNumberByUser
            ).toHaveBeenCalledWith('user-marlin');
            expect(userMobileNumberRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                mobileNumber.id,
                {
                    number: '8129999999',
                    countryId: country.id,
                    phoneCode: '+62',
                },
                false,
                null
            );
            expect(
                userVerificationRepository.expireActiveMobileNumberInTx
            ).toHaveBeenCalledWith(tx, mobileNumber.id, now);
            expect(
                userVerificationRepository.createMobileNumberInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-marlin',
                mobileNumber.id,
                '+628129999999',
                {
                    hashedOtp: verificationCreate.hashedOtp,
                    reference: verificationCreate.reference,
                    expiredAt: verificationCreate.expiredAt,
                },
                now
            );
            expect(
                notificationQueue.sendVerificationMobileNumber
            ).toHaveBeenCalledWith('user-marlin', {
                mobileNumberId: mobileNumber.id,
                phoneNumber: '+628129999999',
                otp: '123456',
                expiredInMinutes: 5,
                expiredAt: expiredAtIso,
                reference: 'VRF-ABCDEFGH',
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSendVerificationMobileNumber,
                userId: 'user-marlin',
                createdBy: 'user-marlin',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
                sendEvent,
            ]);
            expect(callOrder).toEqual([
                'updateInTx',
                'expireActiveMobileNumberInTx',
                'createMobileNumberInTx',
                'stagePrepared',
                'sendVerificationMobileNumber',
            ]);
        });

        it('throws UserMobileNumberNotFoundException when the mobile number does not exist', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                null
            );
            countryDomain.getOne.mockResolvedValue(country);

            await expect(
                domain.updateMobileNumber('user-marlin', 'missing', {
                    number: '8123456789',
                    countryId: country.id,
                    phoneCode: '+62',
                })
            ).rejects.toThrow(UserMobileNumberNotFoundException);
            await expect(
                domain.updateMobileNumber('user-marlin', 'missing', {
                    number: '8123456789',
                    countryId: country.id,
                    phoneCode: '+62',
                })
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

        it('throws UserMobileNumberExistException when another row already has the number', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            countryDomain.getOne.mockResolvedValue(country);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                true
            );

            const call = () =>
                domain.updateMobileNumber('user-marlin', mobileNumber.id, {
                    number: '5559999',
                    countryId: country.id,
                    phoneCode: '+62',
                });

            await expect(call()).rejects.toThrow(
                UserMobileNumberExistException
            );
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberExist
                    ],
                messagePath: 'user.error.mobileNumberExist',
            });
        });

        it('throws UserMobileNumberInvalidException when the phone code does not match the country', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            countryDomain.getOne.mockResolvedValue(country);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );
            userUtil.checkMobileNumber.mockReturnValue(false);

            const call = () =>
                domain.updateMobileNumber('user-marlin', mobileNumber.id, {
                    number: '5559999',
                    countryId: country.id,
                    phoneCode: '+9',
                });

            await expect(call()).rejects.toThrow(
                UserMobileNumberInvalidException
            );
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberInvalid
                    ],
                messagePath: 'user.error.mobileNumberInvalid',
            });
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            countryDomain.getOne.mockResolvedValue(country);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );
            userUtil.checkMobileNumber.mockReturnValue(true);
            const error = new UserMobileNumberExistException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.updateMobileNumber(
                'user-marlin',
                mobileNumber.id,
                {
                    number: mobileNumber.number,
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                }
            );

            await expect(call).rejects.toBeInstanceOf(
                UserMobileNumberExistException
            );
            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberExist
                    ],
                messagePath: 'user.error.mobileNumberExist',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            countryDomain.getOne.mockResolvedValue(country);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );
            userUtil.checkMobileNumber.mockReturnValue(true);
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.updateMobileNumber(
                'user-marlin',
                mobileNumber.id,
                {
                    number: mobileNumber.number,
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                }
            );

            await expect(call).rejects.toBeInstanceOf(AppUnknownException);
            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('deleteMobileNumber', () => {
        it('expires active codes and deletes the mobile number in one transaction, then stages the event', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            const callOrder: string[] = [];
            userVerificationRepository.expireActiveMobileNumberInTx.mockImplementation(
                async () => {
                    callOrder.push('expireActiveMobileNumberInTx');
                }
            );
            userMobileNumberRepository.deleteInTx.mockImplementation(
                async () => {
                    callOrder.push('deleteInTx');
                    return mobileNumber;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            const result = await domain.deleteMobileNumber(
                'user-marlin',
                mobileNumber.id
            );

            expect(result).toBe(mobileNumber);
            expect(userMobileNumberRepository.deleteInTx).toHaveBeenCalledWith(
                tx,
                mobileNumber.id
            );
            expect(userDomain.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userDeleteMobileNumber,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(
                userVerificationRepository.expireActiveMobileNumberInTx
            ).toHaveBeenCalledWith(tx, mobileNumber.id, now);
            expect(callOrder).toEqual([
                'expireActiveMobileNumberInTx',
                'deleteInTx',
                'stagePrepared',
            ]);
        });

        it('throws UserMobileNumberNotFoundException when the mobile number does not exist', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                null
            );

            const call = () =>
                domain.deleteMobileNumber('user-marlin', 'missing');

            await expect(call()).rejects.toThrow(
                UserMobileNumberNotFoundException
            );
            await expect(call()).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberNotFound
                    ],
                messagePath: 'user.error.mobileNumberNotFound',
            });
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            const error = new UserMobileNumberExistException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.deleteMobileNumber(
                'user-marlin',
                mobileNumber.id
            );

            await expect(call).rejects.toBeInstanceOf(
                UserMobileNumberExistException
            );
            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberExist
                    ],
                messagePath: 'user.error.mobileNumberExist',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.deleteMobileNumber(
                'user-marlin',
                mobileNumber.id
            );

            await expect(call).rejects.toBeInstanceOf(AppUnknownException);
            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('resendMobileNumberVerification', () => {
        const ownedMobileNumber = {
            id: mobileNumber.id,
            number: mobileNumber.number,
            phoneCode: mobileNumber.phoneCode,
            isVerified: false,
            verifiedAt: null,
        };

        it('throws UserMobileNumberNotFoundException inside the cooldown when the user does not own the number, before the cooldown lookup', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                null
            );
            userVerificationRepository.findOneLatestMobileNumberByUser.mockResolvedValue(
                latestVerification
            );

            const call = domain.resendMobileNumberVerification(
                'user-marlin',
                'missing'
            );

            await expect(call).rejects.toBeInstanceOf(
                UserMobileNumberNotFoundException
            );
            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberNotFound
                    ],
                messagePath: 'user.error.mobileNumberNotFound',
            });
            expect(
                userMobileNumberRepository.findOneMobileNumber
            ).toHaveBeenCalledWith('user-marlin', 'missing');
            expect(
                userVerificationRepository.findOneLatestMobileNumberByUser
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendVerificationMobileNumber
            ).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberAlreadyVerifiedException inside the cooldown when the number is verified, before the cooldown lookup', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue({
                ...ownedMobileNumber,
                isVerified: true,
                verifiedAt: now,
            });
            userVerificationRepository.findOneLatestMobileNumberByUser.mockResolvedValue(
                latestVerification
            );

            const call = domain.resendMobileNumberVerification(
                'user-marlin',
                mobileNumber.id
            );

            await expect(call).rejects.toBeInstanceOf(
                UserMobileNumberAlreadyVerifiedException
            );
            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberAlreadyVerified,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberAlreadyVerified
                    ],
                messagePath: 'user.error.mobileNumberAlreadyVerified',
            });
            expect(
                userVerificationRepository.findOneLatestMobileNumberByUser
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendVerificationMobileNumber
            ).not.toHaveBeenCalled();
        });

        it('rejects inside the cooldown before any write', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                ownedMobileNumber
            );
            userVerificationRepository.findOneLatestMobileNumberByUser.mockResolvedValue(
                latestVerification
            );

            const call = domain.resendMobileNumberVerification(
                'user-marlin',
                mobileNumber.id
            );

            await expect(call).rejects.toBeInstanceOf(
                UserVerificationMobileNumberResendLimitExceededException
            );
            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.verificationMobileNumberResendLimitExceeded,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError
                            .verificationMobileNumberResendLimitExceeded
                    ],
                messagePath:
                    'user.error.verificationMobileNumberResendLimitExceeded',
                messageProperties: { resendIn: 1 },
            });
            expect(
                userVerificationRepository.findOneLatestMobileNumberByUser
            ).toHaveBeenCalledWith('user-marlin');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                userVerificationRepository.expireActiveMobileNumberInTx
            ).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendVerificationMobileNumber
            ).not.toHaveBeenCalled();
        });

        it('expires the active code and creates a new one in one transaction, then stages and enqueues', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                ownedMobileNumber
            );
            const callOrder: string[] = [];
            userVerificationRepository.expireActiveMobileNumberInTx.mockImplementation(
                async () => {
                    callOrder.push('expireActiveMobileNumberInTx');
                }
            );
            userVerificationRepository.createMobileNumberInTx.mockImplementation(
                async () => {
                    callOrder.push('createMobileNumberInTx');
                    return latestVerification;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendVerificationMobileNumber.mockImplementation(
                async () => {
                    callOrder.push('sendVerificationMobileNumber');
                }
            );

            await expect(
                domain.resendMobileNumberVerification(
                    'user-marlin',
                    mobileNumber.id
                )
            ).resolves.toBeUndefined();

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userVerificationRepository.expireActiveMobileNumberInTx
            ).toHaveBeenCalledWith(tx, mobileNumber.id, now);
            expect(
                userVerificationRepository.createMobileNumberInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-marlin',
                mobileNumber.id,
                '+628123456789',
                {
                    hashedOtp: verificationCreate.hashedOtp,
                    reference: verificationCreate.reference,
                    expiredAt: verificationCreate.expiredAt,
                },
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSendVerificationMobileNumber,
                userId: 'user-marlin',
                createdBy: 'user-marlin',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                sendEvent,
            ]);
            expect(
                notificationQueue.sendVerificationMobileNumber
            ).toHaveBeenCalledWith('user-marlin', {
                mobileNumberId: mobileNumber.id,
                phoneNumber: '+628123456789',
                otp: '123456',
                expiredInMinutes: 5,
                expiredAt: expiredAtIso,
                reference: 'VRF-ABCDEFGH',
            });
            expect(callOrder).toEqual([
                'expireActiveMobileNumberInTx',
                'createMobileNumberInTx',
                'stagePrepared',
                'sendVerificationMobileNumber',
            ]);
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                ownedMobileNumber
            );
            const error = new UserMobileNumberNotFoundException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.resendMobileNumberVerification(
                'user-marlin',
                mobileNumber.id
            );

            await expect(call).rejects.toBe(error);
            expect(
                notificationQueue.sendVerificationMobileNumber
            ).not.toHaveBeenCalled();
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                ownedMobileNumber
            );
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.resendMobileNumberVerification(
                'user-marlin',
                mobileNumber.id
            );

            await expect(call).rejects.toBeInstanceOf(AppUnknownException);
            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('verifyMobileNumber', () => {
        const ownedMobileNumber = {
            id: mobileNumber.id,
            number: mobileNumber.number,
            phoneCode: mobileNumber.phoneCode,
            isVerified: false,
            verifiedAt: null,
        };
        const activeVerification: Verification = {
            ...latestVerification,
            id: 'verification-active',
            token: 'sha256:654321',
            expiredAt: new Date('2026-03-01T00:05:00.000Z'),
            createdAt: new Date('2026-03-01T00:00:00.000Z'),
        };
        const markedMobileNumber: IUserMobileNumber = {
            ...mobileNumber,
            isVerified: true,
            verifiedAt: now,
        };

        beforeEach(() => {
            helperHashService.sha256Hash.mockImplementation(
                value => `sha256:${value}`
            );
            helperHashService.sha256Compare.mockImplementation(
                (hashOne, hashTwo) => hashOne === hashTwo
            );
        });

        it('throws UserMobileNumberNotFoundException for a number the user does not own, before reading any code', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                null
            );

            const call = domain.verifyMobileNumber(
                'user-marlin',
                'mobile-other',
                '654321'
            );

            await expect(call).rejects.toBeInstanceOf(
                UserMobileNumberNotFoundException
            );
            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberNotFound
                    ],
                messagePath: 'user.error.mobileNumberNotFound',
            });
            expect(
                userMobileNumberRepository.findOneMobileNumber
            ).toHaveBeenCalledWith('user-marlin', 'mobile-other');
            expect(
                userVerificationRepository.findOneActiveMobileNumber
            ).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberAlreadyVerifiedException when the number is verified', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue({
                ...ownedMobileNumber,
                isVerified: true,
                verifiedAt: now,
            });

            const call = domain.verifyMobileNumber(
                'user-marlin',
                mobileNumber.id,
                '654321'
            );

            await expect(call).rejects.toBeInstanceOf(
                UserMobileNumberAlreadyVerifiedException
            );
            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberAlreadyVerified,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberAlreadyVerified
                    ],
                messagePath: 'user.error.mobileNumberAlreadyVerified',
            });
            expect(
                userVerificationRepository.findOneActiveMobileNumber
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberOtpInvalidException when no active code exists', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                ownedMobileNumber
            );
            userVerificationRepository.findOneActiveMobileNumber.mockResolvedValue(
                null
            );

            const call = domain.verifyMobileNumber(
                'user-marlin',
                mobileNumber.id,
                '654321'
            );

            await expect(call).rejects.toBeInstanceOf(
                UserMobileNumberOtpInvalidException
            );
            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberOtpInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberOtpInvalid
                    ],
                messagePath: 'user.error.mobileNumberOtpInvalid',
            });
            expect(
                userVerificationRepository.findOneActiveMobileNumber
            ).toHaveBeenCalledWith('user-marlin', mobileNumber.id);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberOtpInvalidException when the otp hash does not match', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                ownedMobileNumber
            );
            userVerificationRepository.findOneActiveMobileNumber.mockResolvedValue(
                activeVerification
            );

            const call = domain.verifyMobileNumber(
                'user-marlin',
                mobileNumber.id,
                '000000'
            );

            await expect(call).rejects.toBeInstanceOf(
                UserMobileNumberOtpInvalidException
            );
            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberOtpInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberOtpInvalid
                    ],
                messagePath: 'user.error.mobileNumberOtpInvalid',
            });
            expect(helperHashService.sha256Compare).toHaveBeenCalledWith(
                'sha256:000000',
                activeVerification.token
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('verify rejects the previous OTP after a resend', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                ownedMobileNumber
            );
            userVerificationRepository.findOneActiveMobileNumber.mockResolvedValue(
                { ...activeVerification, token: 'sha256:777777' }
            );

            await expect(
                domain.verifyMobileNumber(
                    'user-marlin',
                    mobileNumber.id,
                    '654321'
                )
            ).rejects.toBeInstanceOf(UserMobileNumberOtpInvalidException);
            expect(helperHashService.sha256Compare).toHaveBeenCalledWith(
                'sha256:654321',
                'sha256:777777'
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('marks the code used and the number verified in one transaction, stages no activity, and sends no notification', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                ownedMobileNumber
            );
            userVerificationRepository.findOneActiveMobileNumber.mockResolvedValue(
                activeVerification
            );
            const callOrder: string[] = [];
            userVerificationRepository.markUsedActiveMobileNumberInTx.mockImplementation(
                async () => {
                    callOrder.push('markUsedActiveMobileNumberInTx');
                    return true;
                }
            );
            userMobileNumberRepository.markVerifiedInTx.mockImplementation(
                async () => {
                    callOrder.push('markVerifiedInTx');
                    return markedMobileNumber;
                }
            );
            userDomain.touchUpdatedByInTx.mockImplementation(async () => {
                callOrder.push('touchUpdatedByInTx');
            });

            const result = await domain.verifyMobileNumber(
                'user-marlin',
                mobileNumber.id,
                '654321'
            );

            expect(result).toBe(markedMobileNumber);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userVerificationRepository.markUsedActiveMobileNumberInTx
            ).toHaveBeenCalledWith(tx, activeVerification.id, now);
            expect(
                userMobileNumberRepository.markVerifiedInTx
            ).toHaveBeenCalledWith(
                tx,
                mobileNumber.id,
                mobileNumber.number,
                mobileNumber.phoneCode,
                now
            );
            expect(userDomain.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin'
            );
            expect(activityLogDomain.prepare).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(callOrder).toEqual([
                'markUsedActiveMobileNumberInTx',
                'markVerifiedInTx',
                'touchUpdatedByInTx',
            ]);
            expect(
                notificationQueue.sendVerificationMobileNumber
            ).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberOtpInvalidException and leaves the number unverified when the code is no longer active at write time', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                ownedMobileNumber
            );
            userVerificationRepository.findOneActiveMobileNumber.mockResolvedValue(
                activeVerification
            );
            userVerificationRepository.markUsedActiveMobileNumberInTx.mockResolvedValue(
                false
            );

            const call = domain.verifyMobileNumber(
                'user-marlin',
                mobileNumber.id,
                '654321'
            );

            await expect(call).rejects.toBeInstanceOf(
                UserMobileNumberOtpInvalidException
            );
            expect(
                userVerificationRepository.markUsedActiveMobileNumberInTx
            ).toHaveBeenCalledWith(tx, activeVerification.id, now);
            expect(
                userMobileNumberRepository.markVerifiedInTx
            ).not.toHaveBeenCalled();
            expect(userDomain.touchUpdatedByInTx).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberOtpInvalidException when the number changed between the read and the write', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                ownedMobileNumber
            );
            userVerificationRepository.findOneActiveMobileNumber.mockResolvedValue(
                activeVerification
            );
            userVerificationRepository.markUsedActiveMobileNumberInTx.mockResolvedValue(
                true
            );
            userMobileNumberRepository.markVerifiedInTx.mockResolvedValue(null);

            const call = domain.verifyMobileNumber(
                'user-marlin',
                mobileNumber.id,
                '654321'
            );

            await expect(call).rejects.toBeInstanceOf(
                UserMobileNumberOtpInvalidException
            );
            expect(
                userMobileNumberRepository.markVerifiedInTx
            ).toHaveBeenCalledWith(
                tx,
                mobileNumber.id,
                mobileNumber.number,
                mobileNumber.phoneCode,
                now
            );
            expect(userDomain.touchUpdatedByInTx).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                ownedMobileNumber
            );
            userVerificationRepository.findOneActiveMobileNumber.mockResolvedValue(
                activeVerification
            );
            const error = new UserMobileNumberNotFoundException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            await expect(
                domain.verifyMobileNumber(
                    'user-marlin',
                    mobileNumber.id,
                    '654321'
                )
            ).rejects.toBe(error);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                ownedMobileNumber
            );
            userVerificationRepository.findOneActiveMobileNumber.mockResolvedValue(
                activeVerification
            );
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.verifyMobileNumber(
                'user-marlin',
                mobileNumber.id,
                '654321'
            );

            await expect(call).rejects.toBeInstanceOf(AppUnknownException);
            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('assertMobileVerificationCooldown', () => {
        it('passes when the user has no mobile verification yet', async () => {
            await expect(
                domain['assertMobileVerificationCooldown']('user-marlin')
            ).resolves.toBeUndefined();
            expect(
                userVerificationRepository.findOneLatestMobileNumberByUser
            ).toHaveBeenCalledWith('user-marlin');
        });

        it('passes once the resend window has elapsed', async () => {
            userVerificationRepository.findOneLatestMobileNumberByUser.mockResolvedValue(
                {
                    ...latestVerification,
                    createdAt: new Date('2026-02-28T23:58:00.000Z'),
                }
            );

            await expect(
                domain['assertMobileVerificationCooldown']('user-marlin')
            ).resolves.toBeUndefined();
        });

        it('throws with the remaining minutes rounded up inside the resend window', async () => {
            userVerificationRepository.findOneLatestMobileNumberByUser.mockResolvedValue(
                {
                    ...latestVerification,
                    createdAt: new Date('2026-02-28T23:58:30.000Z'),
                }
            );

            const call =
                domain['assertMobileVerificationCooldown']('user-marlin');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.verificationMobileNumberResendLimitExceeded,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError
                            .verificationMobileNumberResendLimitExceeded
                    ],
                messagePath:
                    'user.error.verificationMobileNumberResendLimitExceeded',
                messageProperties: { resendIn: 1 },
            });
            expect(helperDateService.forward).toHaveBeenCalledWith(
                new Date('2026-02-28T23:58:30.000Z'),
                Duration.fromMillis(2 * 60 * 1000)
            );
        });
    });

    describe('createMobileVerification', () => {
        it('builds a hashed otp, a prefixed reference and the expiry from config', () => {
            const result = domain['createMobileVerification']();

            expect(result).toEqual(verificationCreate);
            expect(helperNumberService.randomDigits).toHaveBeenCalledWith(6);
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith('123456');
            expect(helperStringService.random).toHaveBeenCalledWith(8);
            expect(helperDateService.forward).toHaveBeenCalledWith(
                now,
                Duration.fromMillis(5 * 60 * 1000)
            );
        });
    });

    describe('enqueueMobileVerification', () => {
        it('sends the plain otp and the full phone number to the notification queue', async () => {
            await domain['enqueueMobileVerification'](
                'user-marlin',
                mobileNumber,
                verificationCreate
            );

            expect(helperDateService.formatToIso).toHaveBeenCalledWith(
                expiredAt
            );
            expect(
                notificationQueue.sendVerificationMobileNumber
            ).toHaveBeenCalledWith('user-marlin', {
                mobileNumberId: mobileNumber.id,
                phoneNumber: '+628123456789',
                otp: '123456',
                expiredAt: expiredAtIso,
                expiredInMinutes: 5,
                reference: 'VRF-ABCDEFGH',
            });
        });
    });
});
