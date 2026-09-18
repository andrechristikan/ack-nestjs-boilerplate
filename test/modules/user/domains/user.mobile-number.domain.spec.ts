import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { DatabaseService } from '@common/database/services/database.service';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
import { UserMobileNumberInvalidException } from '@modules/user/exceptions/user.mobile-number-invalid.exception';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserMobileNumberDomain } from '@modules/user/domains/user.mobile-number.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import {
    createDatabaseServiceMock,
    mockDatabaseServiceTransaction,
} from '@test/support/database.mock';

describe('UserMobileNumberDomain', () => {
    const userMobileNumberRepository = {
        existsMobileNumber:
            vi.fn<UserMobileNumberRepository['existsMobileNumber']>(),
        addInTx: vi.fn<UserMobileNumberRepository['addInTx']>(),
        findOneMobileNumber:
            vi.fn<UserMobileNumberRepository['findOneMobileNumber']>(),
        updateInTx: vi.fn<UserMobileNumberRepository['updateInTx']>(),
        deleteInTx: vi.fn<UserMobileNumberRepository['deleteInTx']>(),
    } satisfies Pick<
        UserMobileNumberRepository,
        | 'existsMobileNumber'
        | 'addInTx'
        | 'findOneMobileNumber'
        | 'updateInTx'
        | 'deleteInTx'
    >;
    const countryService = {
        getOne: vi.fn<CountryDomain['getOne']>(),
    } satisfies Pick<CountryDomain, 'getOne'>;
    const userUtil = {
        checkMobileNumber: vi.fn<UserUtil['checkMobileNumber']>(),
    } satisfies Pick<UserUtil, 'checkMobileNumber'>;
    const requestStoreGet = vi.fn((_key: string): unknown => null);
    const requestStoreService = {
        get<T>(key: string): T | null {
            return requestStoreGet(key) as T | null;
        },
    } satisfies Pick<RequestStoreService, 'get'>;
    const databaseService = createDatabaseServiceMock();
    const userDomain = createMock<UserDomain>();
    const activityLogDomain = createMock<ActivityLogDomain>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const requestLog = {
        userAgent: { ua: 'browser' },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
    const country = {
        id: 'country-id',
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        continent: 'Asia',
        timezone: 'Asia/Jakarta',
        phoneCodes: ['+62'],
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    };
    const mobileNumber = {
        id: 'mobile-number-id',
        userId: 'user-id',
        countryId: country.id,
        phoneCode: '+62',
        number: '81234567890',
        isVerified: false,
        verifiedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        country,
    } satisfies IUserMobileNumber;

    let service: UserMobileNumberDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        mockDatabaseServiceTransaction(databaseService);
        requestStoreGet.mockReturnValue(requestLog);
        countryService.getOne.mockResolvedValue(country);
        userUtil.checkMobileNumber.mockReturnValue(true);
        userMobileNumberRepository.existsMobileNumber.mockResolvedValue(false);
        userMobileNumberRepository.addInTx.mockResolvedValue(mobileNumber);
        userMobileNumberRepository.findOneMobileNumber.mockResolvedValue({
            id: mobileNumber.id,
            number: mobileNumber.number,
            phoneCode: mobileNumber.phoneCode,
            isVerified: mobileNumber.isVerified,
        });
        userMobileNumberRepository.updateInTx.mockResolvedValue(mobileNumber);
        userMobileNumberRepository.deleteInTx.mockResolvedValue(mobileNumber);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserMobileNumberDomain,
                {
                    provide: UserMobileNumberRepository,
                    useValue: userMobileNumberRepository,
                },
                { provide: UserDomain, useValue: userDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: CountryDomain, useValue: countryService },
                { provide: UserUtil, useValue: userUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        service = moduleRef.get(UserMobileNumberDomain);
    });

    describe('addInTx', () => {
        it('adds a valid, new mobile number', async () => {
            await expect(
                service.addMobileNumber('user-id', {
                    countryId: country.id,
                    phoneCode: '+62',
                    number: mobileNumber.number,
                })
            ).resolves.toEqual(mobileNumber);
            expect(userUtil.checkMobileNumber).toHaveBeenCalledWith(
                country.phoneCodes,
                '+62'
            );
            expect(
                userMobileNumberRepository.existsMobileNumber
            ).toHaveBeenCalledWith('user-id', {
                countryId: country.id,
                phoneCode: '+62',
                number: mobileNumber.number,
            });
            expect(userMobileNumberRepository.addInTx).toHaveBeenCalledWith(
                expect.any(Object),
                'user-id',
                {
                    countryId: country.id,
                    phoneCode: '+62',
                    number: mobileNumber.number,
                }
            );
        });

        it('throws UserMobileNumberInvalidException when the phone code is not allowed for the country', async () => {
            userUtil.checkMobileNumber.mockReturnValue(false);

            await expect(
                service.addMobileNumber('user-id', {
                    countryId: country.id,
                    phoneCode: '+1',
                    number: mobileNumber.number,
                })
            ).rejects.toBeInstanceOf(UserMobileNumberInvalidException);
            expect(userMobileNumberRepository.addInTx).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberExistException when the number already exists', async () => {
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                true
            );

            await expect(
                service.addMobileNumber('user-id', {
                    countryId: country.id,
                    phoneCode: '+62',
                    number: mobileNumber.number,
                })
            ).rejects.toBeInstanceOf(UserMobileNumberExistException);
        });
    });

    describe('updateInTx', () => {
        it('updates an existing mobile number after duplicate and phone-code checks', async () => {
            await expect(
                service.updateMobileNumber('user-id', mobileNumber.id, {
                    countryId: country.id,
                    phoneCode: '+62',
                    number: '89999999999',
                })
            ).resolves.toEqual(mobileNumber);

            expect(
                userMobileNumberRepository.findOneMobileNumber
            ).toHaveBeenCalledWith('user-id', mobileNumber.id);
            expect(
                userMobileNumberRepository.existsMobileNumber
            ).toHaveBeenCalledWith(
                'user-id',
                {
                    countryId: country.id,
                    phoneCode: '+62',
                    number: '89999999999',
                },
                mobileNumber.id
            );
            expect(userMobileNumberRepository.updateInTx).toHaveBeenCalledWith(
                expect.any(Object),
                'user-id',
                mobileNumber.id,
                {
                    countryId: country.id,
                    phoneCode: '+62',
                    number: '89999999999',
                },
                false
            );
        });

        it('throws UserMobileNumberNotFoundException when the mobile number is absent', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                null
            );

            await expect(
                service.updateMobileNumber('user-id', mobileNumber.id, {
                    countryId: country.id,
                    phoneCode: '+62',
                    number: mobileNumber.number,
                })
            ).rejects.toBeInstanceOf(UserMobileNumberNotFoundException);
        });
    });

    describe('deleteInTx', () => {
        it('deletes an existing mobile number', async () => {
            await expect(
                service.deleteMobileNumber('user-id', mobileNumber.id)
            ).resolves.toEqual(mobileNumber);

            expect(userMobileNumberRepository.deleteInTx).toHaveBeenCalledWith(
                expect.any(Object),
                mobileNumber.id
            );
        });

        it('throws UserMobileNumberNotFoundException when the mobile number is missing', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                null
            );

            await expect(
                service.deleteMobileNumber('user-id', mobileNumber.id)
            ).rejects.toBeInstanceOf(UserMobileNumberNotFoundException);
            expect(
                userMobileNumberRepository.deleteInTx
            ).not.toHaveBeenCalled();
        });
    });
});
