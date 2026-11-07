import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumUserGender,
    EnumActivityLogAction,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { CountryService } from '@modules/country/services/country.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.update-profile.request.dto';
import { UserUpdateProfileUseCase } from '@modules/user/use-cases/user.update-profile.use-case';

describe('UserUpdateProfileUseCase', () => {
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const countryService: MockProxy<CountryService> = mock<CountryService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    let useCase: UserUpdateProfileUseCase;

    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userUpdateProfile,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(activityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserUpdateProfileUseCase,
                { provide: UserProfileService, useValue: userProfileService },
                { provide: CountryService, useValue: countryService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        useCase = module.get(UserUpdateProfileUseCase);
    });

    describe('execute', () => {
        it('delegates the update to the domain', async () => {
            const dto: UserUpdateProfileRequestDto = {
                name: 'Sable Grove Jr.',
                countryId: 'country-sable',
                gender: EnumUserGender.male,
            };

            await useCase.execute('user-sable', dto);

            expect(countryService.getOne).toHaveBeenCalledWith(dto.countryId);
            expect(userProfileService.updateProfile).toHaveBeenCalledWith(
                'user-sable',
                {
                    countryId: dto.countryId,
                    gender: dto.gender,
                    name: dto.name,
                }
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userUpdateProfile,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('writes and stages nothing when the country is missing', async () => {
            const dto: UserUpdateProfileRequestDto = {
                name: 'Sable Grove Jr.',
                countryId: 'country-missing',
                gender: EnumUserGender.male,
            };
            countryService.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );

            await expect(
                useCase.execute('user-sable', dto)
            ).rejects.toBeInstanceOf(CountryNotFoundException);

            expect(userProfileService.updateProfile).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('passes a null name through to clear it', async () => {
            const dto: UserUpdateProfileRequestDto = {
                name: null,
                countryId: 'country-sable',
                gender: EnumUserGender.male,
            };

            await useCase.execute('user-sable', dto);

            expect(userProfileService.updateProfile).toHaveBeenCalledWith(
                'user-sable',
                {
                    countryId: dto.countryId,
                    gender: dto.gender,
                    name: null,
                }
            );
        });
    });
});
