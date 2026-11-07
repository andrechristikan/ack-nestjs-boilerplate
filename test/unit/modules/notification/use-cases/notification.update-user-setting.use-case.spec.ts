import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import type { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationUpdateUserSettingUseCase } from '@modules/notification/use-cases/notification.update-user-setting.use-case';

describe('NotificationUpdateUserSettingUseCase', () => {
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    let useCase: NotificationUpdateUserSettingUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationUpdateUserSettingUseCase,
                { provide: NotificationService, useValue: notificationService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        useCase = module.get(NotificationUpdateUserSettingUseCase);
    });

    describe('execute', () => {
        const data: NotificationUserSettingRequestDto = {
            channel: EnumNotificationChannel.email,
            type: EnumNotificationType.userActivity,
            isActive: true,
        };
        const stagedActivityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.userUpdateNotificationSetting,
            metadata: {},
            userId: null,
            createdBy: null,
            workspaceId: null,
        };

        it('prepares the activity row, updates the setting, stages the row, and returns an empty response', async () => {
            activityLogService.prepare.mockReturnValue(stagedActivityLog);
            notificationService.updateUserSetting.mockResolvedValue(undefined);

            const result = await useCase.execute('user-id', data);

            expect(result).toEqual({});
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userUpdateNotificationSetting,
                metadata: {
                    channel: data.channel,
                    type: data.type,
                    isActive: data.isActive,
                },
            });
            expect(notificationService.updateUserSetting).toHaveBeenCalledWith(
                'user-id',
                data
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the domain update rejects', async () => {
            const failure = new Error('write failed');
            activityLogService.prepare.mockReturnValue(stagedActivityLog);
            notificationService.updateUserSetting.mockRejectedValue(failure);

            await expect(useCase.execute('user-id', data)).rejects.toBe(
                failure
            );
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
