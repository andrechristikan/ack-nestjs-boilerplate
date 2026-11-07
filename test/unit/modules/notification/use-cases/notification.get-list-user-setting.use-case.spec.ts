import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { NotificationUserSetting } from '@generated/prisma-client/client';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationGetListUserSettingUseCase } from '@modules/notification/use-cases/notification.get-list-user-setting.use-case';

describe('NotificationGetListUserSettingUseCase', () => {
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    let useCase: NotificationGetListUserSettingUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationGetListUserSettingUseCase,
                { provide: NotificationService, useValue: notificationService },
            ],
        }).compile();
        useCase = module.get(NotificationGetListUserSettingUseCase);
    });

    describe('execute', () => {
        it('wraps the settings list in the response envelope', async () => {
            const settings: NotificationUserSetting[] = [];
            notificationService.getListUserSetting.mockResolvedValue(settings);

            const result = await useCase.execute('user-id');

            expect(notificationService.getListUserSetting).toHaveBeenCalledWith(
                'user-id'
            );
            expect(result).toEqual({ data: { settings } });
        });
    });
});
