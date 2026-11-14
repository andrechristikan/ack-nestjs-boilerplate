import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { NotificationService } from '@modules/notification/services/notification.service';
import type { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationUpdateUserSettingUseCase } from '@modules/notification/use-cases/notification.update-user-setting.use-case';

describe('NotificationUpdateUserSettingUseCase', () => {
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-id', 'actor@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    let useCase: NotificationUpdateUserSettingUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationUpdateUserSettingUseCase,
                { provide: NotificationService, useValue: notificationService },
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

        it('updates the setting passing the request context and returns an empty response', async () => {
            notificationService.updateUserSetting.mockResolvedValue(undefined);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                data
            );

            expect(result).toEqual({});
            expect(notificationService.updateUserSetting).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                data
            );
        });

        it('rethrows the domain rejection', async () => {
            const failure = new Error('write failed');
            notificationService.updateUserSetting.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    data
                )
            ).rejects.toBe(failure);
        });
    });
});
