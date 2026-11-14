import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { CountryService } from '@modules/country/services/country.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { UserAddMobileNumberUseCase } from '@modules/user/use-cases/user.add-mobile-number.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserAddMobileNumberUseCase', () => {
    const userMobileNumberService: MockProxy<UserMobileNumberService> =
        mock<UserMobileNumberService>();
    const countryService: MockProxy<CountryService> = mock<CountryService>();

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-swift', 'user-swift@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);

    let useCase: UserAddMobileNumberUseCase;

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
                UserAddMobileNumberUseCase,
                {
                    provide: UserMobileNumberService,
                    useValue: userMobileNumberService,
                },
                { provide: CountryService, useValue: countryService },
            ],
        }).compile();
        useCase = module.get(UserAddMobileNumberUseCase);
    });

    describe('execute', () => {
        it('adds the mobile number, passes the context, and wraps it in a response envelope', async () => {
            userMobileNumberService.addMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).resolves.toEqual({
                data: mobileNumber,
            });
            expect(countryService.getOne).toHaveBeenCalledWith(dto.countryId);
            expect(
                userMobileNumberService.addMobileNumber
            ).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    number: dto.number,
                    countryId: dto.countryId,
                    phoneCode: dto.phoneCode,
                },
                mobileNumber.country.phoneCode,
                false
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
                null
            );
        });

        it('reads the country and the duplicate number together', async () => {
            const deferredCountry =
                buildDeferred<IUserMobileNumber['country']>();
            countryService.getOne.mockReturnValue(deferredCountry.promise);
            userMobileNumberService.existsMobileNumber.mockImplementation(
                async () => {
                    deferredCountry.resolve(mobileNumber.country);

                    return false;
                }
            );
            userMobileNumberService.addMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                dto
            );

            expect(
                userMobileNumberService.addMobileNumber
            ).toHaveBeenCalledTimes(1);
        });

        it('writes nothing when the country is missing', async () => {
            countryService.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).rejects.toBeInstanceOf(CountryNotFoundException);

            expect(
                userMobileNumberService.addMobileNumber
            ).not.toHaveBeenCalled();
        });

        it('writes nothing when the domain write rejects', async () => {
            userMobileNumberService.addMobileNumber.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).rejects.toThrow('boom');
        });
    });
});
