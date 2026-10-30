import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { UserMobileNumberDomain } from '@modules/user/domains/user.mobile-number.domain';
import { UserMobileNumberHttpService } from '@modules/user/services/http/user.mobile-number.http.service';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';

describe('UserMobileNumberHttpService', () => {
    const userMobileNumberDomain: MockProxy<UserMobileNumberDomain> =
        mock<UserMobileNumberDomain>();
    const countryDomain: MockProxy<CountryDomain> = mock<CountryDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();

    let service: UserMobileNumberHttpService;

    const dto: UserAddMobileNumberRequestDto = {
        countryId: 'country-swift',
        number: '81234567890',
        phoneCode: '62',
    };
    const mobileNumber: IUserMobileNumber = {
        id: 'mobile-swift',
        userId: 'user-swift',
        countryId: dto.countryId,
        phoneCode: dto.phoneCode,
        number: dto.number,
        isVerified: false,
        verifiedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        country: {
            id: dto.countryId,
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
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userAddMobileNumber,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        countryDomain.getOne.mockResolvedValue(mobileNumber.country);
        userMobileNumberDomain.existsMobileNumber.mockResolvedValue(false);
        userMobileNumberDomain.getOneMobileNumber.mockResolvedValue(
            mobileNumber
        );
        activityLogDomain.prepare.mockReturnValue(activityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserMobileNumberHttpService,
                {
                    provide: UserMobileNumberDomain,
                    useValue: userMobileNumberDomain,
                },
                { provide: CountryDomain, useValue: countryDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
            ],
        }).compile();
        service = module.get(UserMobileNumberHttpService);
    });

    describe('addMobileNumber', () => {
        it('adds the mobile number, stages the activity row, and wraps it in a response envelope', async () => {
            userMobileNumberDomain.addMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await expect(
                service.addMobileNumber('user-swift', dto)
            ).resolves.toEqual({ data: mobileNumber });
            expect(countryDomain.getOne).toHaveBeenCalledWith(dto.countryId);
            expect(userMobileNumberDomain.addMobileNumber).toHaveBeenCalledWith(
                'user-swift',
                {
                    number: dto.number,
                    countryId: dto.countryId,
                    phoneCode: dto.phoneCode,
                },
                mobileNumber.country.phoneCode,
                false
            );
            expect(
                userMobileNumberDomain.existsMobileNumber
            ).toHaveBeenCalledWith(
                'user-swift',
                {
                    number: dto.number,
                    countryId: dto.countryId,
                    phoneCode: dto.phoneCode,
                },
                null
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userAddMobileNumber,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('reads the country and the duplicate number together', async () => {
            const deferredCountry =
                Promise.withResolvers<IUserMobileNumber['country']>();
            countryDomain.getOne.mockReturnValue(deferredCountry.promise);
            userMobileNumberDomain.existsMobileNumber.mockImplementation(
                async () => {
                    deferredCountry.resolve(mobileNumber.country);

                    return false;
                }
            );
            userMobileNumberDomain.addMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await service.addMobileNumber('user-swift', dto);

            expect(
                userMobileNumberDomain.addMobileNumber
            ).toHaveBeenCalledTimes(1);
        });

        it('writes and stages nothing when the country is missing', async () => {
            countryDomain.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );

            await expect(
                service.addMobileNumber('user-swift', dto)
            ).rejects.toBeInstanceOf(CountryNotFoundException);

            expect(
                userMobileNumberDomain.addMobileNumber
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages nothing when the domain write rejects', async () => {
            userMobileNumberDomain.addMobileNumber.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                service.addMobileNumber('user-swift', dto)
            ).rejects.toThrow('boom');

            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('updateMobileNumber', () => {
        it('updates the mobile number, stages the activity row, and wraps it in a response envelope', async () => {
            userMobileNumberDomain.updateMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await expect(
                service.updateMobileNumber('user-swift', mobileNumber.id, dto)
            ).resolves.toEqual({ data: mobileNumber });
            expect(
                userMobileNumberDomain.getOneMobileNumber
            ).toHaveBeenCalledWith('user-swift', mobileNumber.id);
            expect(countryDomain.getOne).toHaveBeenCalledWith(dto.countryId);
            expect(
                userMobileNumberDomain.updateMobileNumber
            ).toHaveBeenCalledWith(
                'user-swift',
                mobileNumber,
                {
                    number: dto.number,
                    countryId: dto.countryId,
                    phoneCode: dto.phoneCode,
                },
                mobileNumber.country.phoneCode,
                false
            );
            expect(
                userMobileNumberDomain.existsMobileNumber
            ).toHaveBeenCalledWith(
                'user-swift',
                {
                    number: dto.number,
                    countryId: dto.countryId,
                    phoneCode: dto.phoneCode,
                },
                mobileNumber.id
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userUpdateMobileNumber,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('reads the country and the duplicate number together after the number is found', async () => {
            const deferredCountry =
                Promise.withResolvers<IUserMobileNumber['country']>();
            countryDomain.getOne.mockReturnValue(deferredCountry.promise);
            userMobileNumberDomain.existsMobileNumber.mockImplementation(
                async () => {
                    deferredCountry.resolve(mobileNumber.country);

                    return false;
                }
            );
            userMobileNumberDomain.updateMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await service.updateMobileNumber(
                'user-swift',
                mobileNumber.id,
                dto
            );

            expect(
                userMobileNumberDomain.updateMobileNumber
            ).toHaveBeenCalledTimes(1);
        });

        it('writes and stages nothing when the country is missing', async () => {
            countryDomain.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );

            await expect(
                service.updateMobileNumber('user-swift', mobileNumber.id, dto)
            ).rejects.toBeInstanceOf(CountryNotFoundException);

            expect(
                userMobileNumberDomain.updateMobileNumber
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('fails on a missing mobile number before reading the country', async () => {
            const error = new Error('mobile-number-missing');
            userMobileNumberDomain.getOneMobileNumber.mockRejectedValue(error);

            await expect(
                service.updateMobileNumber('user-swift', 'missing', dto)
            ).rejects.toBe(error);

            expect(countryDomain.getOne).not.toHaveBeenCalled();
            expect(
                userMobileNumberDomain.updateMobileNumber
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('deleteMobileNumber', () => {
        it('deletes the mobile number, stages the activity row, and wraps it in a response envelope', async () => {
            userMobileNumberDomain.deleteMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await expect(
                service.deleteMobileNumber('user-swift', mobileNumber.id)
            ).resolves.toEqual({ data: mobileNumber });
            expect(
                userMobileNumberDomain.deleteMobileNumber
            ).toHaveBeenCalledWith('user-swift', mobileNumber.id);
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userDeleteMobileNumber,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });
    });
});
