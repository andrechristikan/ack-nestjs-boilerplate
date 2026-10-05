import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Country } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserMobileNumberDomain } from '@modules/user/domains/user.mobile-number.domain';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserMobileNumberDomain', () => {
    const userMobileNumberRepository: MockProxy<UserMobileNumberRepository> =
        mock<UserMobileNumberRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const countryDomain: MockProxy<CountryDomain> = mock<CountryDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();

    let domain: UserMobileNumberDomain;

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
    const event: IActivityLogStagedEvent = {
        action: EnumActivityLogAction.userAddMobileNumber,
        metadata: {},
        onError: false,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        activityLogDomain.prepare.mockReturnValue(event);

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
            ],
        }).compile();
        domain = module.get(UserMobileNumberDomain);
    });

    describe('addMobileNumber', () => {
        it('adds the mobile number and stages the activity log event', async () => {
            countryDomain.getOne.mockResolvedValue(country);
            userUtil.checkMobileNumber.mockReturnValue(true);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );
            userMobileNumberRepository.addInTx.mockResolvedValue(mobileNumber);

            const result = await domain.addMobileNumber('user-marlin', {
                number: '5551234',
                countryId: country.id,
                phoneCode: '+1',
            });

            expect(result).toBe(mobileNumber);
            expect(userMobileNumberRepository.addInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin',
                {
                    number: '5551234',
                    countryId: country.id,
                    phoneCode: '+1',
                }
            );
            expect(userDomain.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin'
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
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
                    number: '5551234',
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
                    number: '5551234',
                    countryId: country.id,
                    phoneCode: '+1',
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
                number: '5551234',
                countryId: country.id,
                phoneCode: '+1',
            });

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
                number: '5551234',
                countryId: country.id,
                phoneCode: '+1',
            });

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
            const verified = { ...mobileNumber, isVerified: true };
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
                true
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userUpdateMobileNumber,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(callOrder).toEqual(['updateInTx', 'stagePrepared']);
        });

        it('resets verification when the number changes', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue({
                ...mobileNumber,
                isVerified: true,
            });
            countryDomain.getOne.mockResolvedValue(country);
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );
            userUtil.checkMobileNumber.mockReturnValue(true);
            userMobileNumberRepository.updateInTx.mockResolvedValue(
                mobileNumber
            );

            await domain.updateMobileNumber('user-marlin', mobileNumber.id, {
                number: '5559999',
                countryId: country.id,
                phoneCode: mobileNumber.phoneCode,
            });

            expect(userMobileNumberRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                mobileNumber.id,
                {
                    number: '5559999',
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                },
                false
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('throws UserMobileNumberNotFoundException when the mobile number does not exist', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                null
            );
            countryDomain.getOne.mockResolvedValue(country);

            await expect(
                domain.updateMobileNumber('user-marlin', 'missing', {
                    number: '5551234',
                    countryId: country.id,
                    phoneCode: '+1',
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

            const call = domain.updateMobileNumber(
                'user-marlin',
                mobileNumber.id,
                {
                    number: '5559999',
                    countryId: country.id,
                    phoneCode: '+1',
                }
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

            const call = domain.updateMobileNumber(
                'user-marlin',
                mobileNumber.id,
                {
                    number: '5559999',
                    countryId: country.id,
                    phoneCode: '+9',
                }
            );

            await expect(call).rejects.toMatchObject({
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
        it('deletes the mobile number and stages the activity log event in order', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            const callOrder: string[] = [];
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
            expect(callOrder).toEqual(['deleteInTx', 'stagePrepared']);
        });

        it('throws UserMobileNumberNotFoundException when the mobile number does not exist', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                null
            );

            const call = domain.deleteMobileNumber('user-marlin', 'missing');

            await expect(call).rejects.toMatchObject({
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
});
