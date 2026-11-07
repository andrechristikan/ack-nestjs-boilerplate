import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { UserUpdateProfilePhotoRequestDto } from '@modules/user/dtos/request/user.update-profile-photo.request.dto';
import { UserUpdatePhotoProfileUseCase } from '@modules/user/use-cases/user.update-photo-profile.use-case';

describe('UserUpdatePhotoProfileUseCase', () => {
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    let useCase: UserUpdatePhotoProfileUseCase;

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
                UserUpdatePhotoProfileUseCase,
                { provide: UserProfileService, useValue: userProfileService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        useCase = module.get(UserUpdatePhotoProfileUseCase);
    });

    describe('execute', () => {
        it('delegates the update to the domain', async () => {
            const dto: UserUpdateProfilePhotoRequestDto = {
                key: 'photo-profile/user-sable/random.png',
            };

            await useCase.execute('user-sable', dto);

            expect(userProfileService.updatePhotoProfile).toHaveBeenCalledWith(
                'user-sable',
                { key: dto.key }
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userUpdatePhotoProfile,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('stages nothing when the domain write rejects', async () => {
            userProfileService.updatePhotoProfile.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute('user-sable', {
                    key: 'photo-profile/user-sable/random.png',
                })
            ).rejects.toThrow('boom');

            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
