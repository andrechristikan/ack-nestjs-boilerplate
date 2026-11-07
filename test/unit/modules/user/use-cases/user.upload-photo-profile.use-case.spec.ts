import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IFile } from '@common/file/interfaces/file.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { UserUploadPhotoProfileUseCase } from '@modules/user/use-cases/user.upload-photo-profile.use-case';

describe('UserUploadPhotoProfileUseCase', () => {
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    let useCase: UserUploadPhotoProfileUseCase;

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
                UserUploadPhotoProfileUseCase,
                { provide: UserProfileService, useValue: userProfileService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        useCase = module.get(UserUploadPhotoProfileUseCase);
    });

    describe('execute', () => {
        it('delegates the file to the domain', async () => {
            const file = {
                originalname: 'photo.png',
                size: 2048,
                buffer: Buffer.from('binary-data'),
            } as IFile;

            await useCase.execute('user-sable', file);

            expect(userProfileService.uploadPhotoProfile).toHaveBeenCalledWith(
                'user-sable',
                file
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userUpdatePhotoProfile,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });
    });
});
