import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserDeleteMobileNumberUseCase } from '@modules/user/use-cases/user.delete-mobile-number.use-case';

describe('UserDeleteMobileNumberUseCase', () => {
    const userMobileNumberService: MockProxy<UserMobileNumberService> =
        mock<UserMobileNumberService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

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
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userAddMobileNumber,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        userMobileNumberService.existsMobileNumber.mockResolvedValue(false);
        userMobileNumberService.getOneMobileNumber.mockResolvedValue(
            mobileNumber
        );
        activityLogService.prepare.mockReturnValue(activityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserDeleteMobileNumberUseCase,
                {
                    provide: UserMobileNumberService,
                    useValue: userMobileNumberService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        useCase = module.get(UserDeleteMobileNumberUseCase);
    });

    describe('execute', () => {
        it('deletes the mobile number, stages the activity row, and wraps it in a response envelope', async () => {
            userMobileNumberService.deleteMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await expect(
                useCase.execute('user-swift', mobileNumber.id)
            ).resolves.toEqual({ data: mobileNumber });
            expect(
                userMobileNumberService.deleteMobileNumber
            ).toHaveBeenCalledWith('user-swift', mobileNumber.id);
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userDeleteMobileNumber,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });
    });
});
