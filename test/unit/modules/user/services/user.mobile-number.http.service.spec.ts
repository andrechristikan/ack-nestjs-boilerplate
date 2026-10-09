import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { UserMobileNumberDomain } from '@modules/user/domains/user.mobile-number.domain';
import { UserMobileNumberHttpService } from '@modules/user/services/user.mobile-number.http.service';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';

describe('UserMobileNumberHttpService', () => {
    const userMobileNumberDomain: MockProxy<UserMobileNumberDomain> =
        mock<UserMobileNumberDomain>();

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

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserMobileNumberHttpService,
                {
                    provide: UserMobileNumberDomain,
                    useValue: userMobileNumberDomain,
                },
            ],
        }).compile();
        service = module.get(UserMobileNumberHttpService);
    });

    describe('addMobileNumber', () => {
        it('adds the mobile number and wraps it in a response envelope', async () => {
            userMobileNumberDomain.addMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await expect(
                service.addMobileNumber('user-swift', dto)
            ).resolves.toEqual({ data: mobileNumber });
            expect(userMobileNumberDomain.addMobileNumber).toHaveBeenCalledWith(
                'user-swift',
                {
                    number: dto.number,
                    countryId: dto.countryId,
                    phoneCode: dto.phoneCode,
                }
            );
        });
    });

    describe('updateMobileNumber', () => {
        it('updates the mobile number and wraps it in a response envelope', async () => {
            userMobileNumberDomain.updateMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await expect(
                service.updateMobileNumber('user-swift', mobileNumber.id, dto)
            ).resolves.toEqual({ data: mobileNumber });
            expect(
                userMobileNumberDomain.updateMobileNumber
            ).toHaveBeenCalledWith('user-swift', mobileNumber.id, {
                number: dto.number,
                countryId: dto.countryId,
                phoneCode: dto.phoneCode,
            });
        });
    });

    describe('deleteMobileNumber', () => {
        it('deletes the mobile number and wraps it in a response envelope', async () => {
            userMobileNumberDomain.deleteMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await expect(
                service.deleteMobileNumber('user-swift', mobileNumber.id)
            ).resolves.toEqual({ data: mobileNumber });
            expect(
                userMobileNumberDomain.deleteMobileNumber
            ).toHaveBeenCalledWith('user-swift', mobileNumber.id);
        });
    });
});
