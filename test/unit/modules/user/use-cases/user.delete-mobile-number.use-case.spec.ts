import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserDeleteMobileNumberUseCase } from '@modules/user/use-cases/user.delete-mobile-number.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserDeleteMobileNumberUseCase', () => {
    const userMobileNumberService: MockProxy<UserMobileNumberService> =
        mock<UserMobileNumberService>();

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-swift', 'user-swift@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);

    let useCase: UserDeleteMobileNumberUseCase;

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
        userMobileNumberService.existsMobileNumber.mockResolvedValue(false);
        userMobileNumberService.getOneMobileNumber.mockResolvedValue(
            mobileNumber
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserDeleteMobileNumberUseCase,
                {
                    provide: UserMobileNumberService,
                    useValue: userMobileNumberService,
                },
            ],
        }).compile();
        useCase = module.get(UserDeleteMobileNumberUseCase);
    });

    describe('execute', () => {
        it('deletes the mobile number, passes the context, and wraps it in a response envelope', async () => {
            userMobileNumberService.deleteMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    mobileNumber.id
                )
            ).resolves.toEqual({ data: mobileNumber });
            expect(
                userMobileNumberService.deleteMobileNumber
            ).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                mobileNumber.id
            );
        });
    });
});
