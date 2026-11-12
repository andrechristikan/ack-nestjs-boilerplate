import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { CountryService } from '@modules/country/services/country.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { UserUpdateMobileNumberUseCase } from '@modules/user/use-cases/user.update-mobile-number.use-case';

describe('UserUpdateMobileNumberUseCase', () => {
    const userMobileNumberService: MockProxy<UserMobileNumberService> =
        mock<UserMobileNumberService>();
    const countryService: MockProxy<CountryService> = mock<CountryService>();

    const context = buildRequestContext('user-swift');

    let useCase: UserUpdateMobileNumberUseCase;

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

    beforeEach(async () => {
        vi.resetAllMocks();
        countryService.getOne.mockResolvedValue(mobileNumber.country);
        userMobileNumberService.existsMobileNumber.mockResolvedValue(false);
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
                { provide: CountryService, useValue: countryService },
            ],
        }).compile();
        useCase = module.get(UserUpdateMobileNumberUseCase);
    });

    describe('execute', () => {
        it('updates the mobile number, passes the context, and wraps it in a response envelope', async () => {
            userMobileNumberService.updateMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await expect(
                useCase.execute('user-swift', mobileNumber.id, dto, context)
            ).resolves.toEqual({ data: mobileNumber });
            expect(
                userMobileNumberService.getOneMobileNumber
            ).toHaveBeenCalledWith('user-swift', mobileNumber.id);
            expect(countryService.getOne).toHaveBeenCalledWith(dto.countryId);
            expect(
                userMobileNumberService.updateMobileNumber
            ).toHaveBeenCalledWith(
                'user-swift',
                mobileNumber,
                {
                    number: dto.number,
                    countryId: dto.countryId,
                    phoneCode: dto.phoneCode,
                },
                mobileNumber.country.phoneCode,
                false,
                context
            );
            expect(
                userMobileNumberService.existsMobileNumber
            ).toHaveBeenCalledWith(
                'user-swift',
                {
                    number: dto.number,
                    countryId: dto.countryId,
                    phoneCode: dto.phoneCode,
                },
                mobileNumber.id
            );
        });

        it('reads the country and the duplicate number together after the number is found', async () => {
            const deferredCountry =
                buildDeferred<IUserMobileNumber['country']>();
            countryService.getOne.mockReturnValue(deferredCountry.promise);
            userMobileNumberService.existsMobileNumber.mockImplementation(
                async () => {
                    deferredCountry.resolve(mobileNumber.country);

                    return false;
                }
            );
            userMobileNumberService.updateMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await useCase.execute('user-swift', mobileNumber.id, dto, context);

            expect(
                userMobileNumberService.updateMobileNumber
            ).toHaveBeenCalledTimes(1);
        });

        it('writes nothing when the country is missing', async () => {
            countryService.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );

            await expect(
                useCase.execute('user-swift', mobileNumber.id, dto, context)
            ).rejects.toBeInstanceOf(CountryNotFoundException);

            expect(
                userMobileNumberService.updateMobileNumber
            ).not.toHaveBeenCalled();
        });

        it('fails on a missing mobile number before reading the country', async () => {
            const error = new Error('mobile-number-missing');
            userMobileNumberService.getOneMobileNumber.mockRejectedValue(error);

            await expect(
                useCase.execute('user-swift', 'missing', dto, context)
            ).rejects.toBe(error);

            expect(countryService.getOne).not.toHaveBeenCalled();
            expect(
                userMobileNumberService.updateMobileNumber
            ).not.toHaveBeenCalled();
        });
    });
});
