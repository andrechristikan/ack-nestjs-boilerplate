import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { CountryService } from '@modules/country/services/country.service';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
import { UserMobileNumberInvalidException } from '@modules/user/exceptions/user.mobile-number-invalid.exception';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserMobileNumberService', () => {
    const userMobileNumberRepository = {
        existMobileNumber:
            vi.fn<UserMobileNumberRepository['existMobileNumber']>(),
        addMobileNumber: vi.fn<UserMobileNumberRepository['addMobileNumber']>(),
        findOneMobileNumber:
            vi.fn<UserMobileNumberRepository['findOneMobileNumber']>(),
        updateMobileNumber:
            vi.fn<UserMobileNumberRepository['updateMobileNumber']>(),
        deleteMobileNumber:
            vi.fn<UserMobileNumberRepository['deleteMobileNumber']>(),
    } satisfies Pick<
        UserMobileNumberRepository,
        | 'existMobileNumber'
        | 'addMobileNumber'
        | 'findOneMobileNumber'
        | 'updateMobileNumber'
        | 'deleteMobileNumber'
    >;
    const countryService = {
        getOne: vi.fn<CountryService['getOne']>(),
    } satisfies Pick<CountryService, 'getOne'>;
    const userUtil = {
        checkMobileNumber: vi.fn<UserUtil['checkMobileNumber']>(),
    } satisfies Pick<UserUtil, 'checkMobileNumber'>;
    const requestStoreGet = vi.fn((_key: string): unknown => null);
    const requestStoreService = {
        get<T>(key: string): T | null {
            return requestStoreGet(key) as T | null;
        },
    } satisfies Pick<RequestStoreService, 'get'>;

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

    let service: UserMobileNumberService;

    beforeEach(async () => {
        vi.resetAllMocks();
        requestStoreGet.mockReturnValue(requestLog);
        countryService.getOne.mockResolvedValue(country);
        userUtil.checkMobileNumber.mockReturnValue(true);
        userMobileNumberRepository.existMobileNumber.mockResolvedValue(null);
        userMobileNumberRepository.addMobileNumber.mockResolvedValue(
            mobileNumber
        );
        userMobileNumberRepository.findOneMobileNumber.mockResolvedValue({
            id: mobileNumber.id,
            number: mobileNumber.number,
            phoneCode: mobileNumber.phoneCode,
            isVerified: mobileNumber.isVerified,
        });
        userMobileNumberRepository.updateMobileNumber.mockResolvedValue(
            mobileNumber
        );
        userMobileNumberRepository.deleteMobileNumber.mockResolvedValue(
            mobileNumber
        );

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserMobileNumberService,
                {
                    provide: UserMobileNumberRepository,
                    useValue: userMobileNumberRepository,
                },
                { provide: CountryService, useValue: countryService },
                { provide: UserUtil, useValue: userUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = moduleRef.get(UserMobileNumberService);
    });

    describe('addMobileNumber', () => {
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
                userMobileNumberRepository.existMobileNumber
            ).toHaveBeenCalledWith('user-id', {
                countryId: country.id,
                phoneCode: '+62',
                number: mobileNumber.number,
            });
            expect(
                userMobileNumberRepository.addMobileNumber
            ).toHaveBeenCalledWith(
                'user-id',
                {
                    countryId: country.id,
                    phoneCode: '+62',
                    number: mobileNumber.number,
                },
                requestLog
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
            expect(
                userMobileNumberRepository.addMobileNumber
            ).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberExistException when the number already exists', async () => {
            userMobileNumberRepository.existMobileNumber.mockResolvedValue({
                id: mobileNumber.id,
            });

            await expect(
                service.addMobileNumber('user-id', {
                    countryId: country.id,
                    phoneCode: '+62',
                    number: mobileNumber.number,
                })
            ).rejects.toBeInstanceOf(UserMobileNumberExistException);
        });
    });

    describe('updateMobileNumber', () => {
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
                userMobileNumberRepository.existMobileNumber
            ).toHaveBeenCalledWith(
                'user-id',
                {
                    countryId: country.id,
                    phoneCode: '+62',
                    number: '89999999999',
                },
                mobileNumber.id
            );
            expect(
                userMobileNumberRepository.updateMobileNumber
            ).toHaveBeenCalledWith(
                'user-id',
                {
                    id: mobileNumber.id,
                    number: mobileNumber.number,
                    phoneCode: mobileNumber.phoneCode,
                    isVerified: mobileNumber.isVerified,
                },
                {
                    countryId: country.id,
                    phoneCode: '+62',
                    number: '89999999999',
                },
                requestLog
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

    describe('deleteMobileNumber', () => {
        it('deletes an existing mobile number', async () => {
            await expect(
                service.deleteMobileNumber('user-id', mobileNumber.id)
            ).resolves.toEqual(mobileNumber);

            expect(
                userMobileNumberRepository.deleteMobileNumber
            ).toHaveBeenCalledWith('user-id', mobileNumber.id, requestLog);
        });

        it('throws UserMobileNumberNotFoundException when the mobile number is missing', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                null
            );

            await expect(
                service.deleteMobileNumber('user-id', mobileNumber.id)
            ).rejects.toBeInstanceOf(UserMobileNumberNotFoundException);
            expect(
                userMobileNumberRepository.deleteMobileNumber
            ).not.toHaveBeenCalled();
        });
    });
});
