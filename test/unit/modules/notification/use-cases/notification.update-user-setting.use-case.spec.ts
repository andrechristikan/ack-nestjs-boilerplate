import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
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
import { NotificationInvalidTypeException } from '@modules/notification/exceptions/notification.invalid-type.exception';
import { NotificationService } from '@modules/notification/services/notification.service';
import type { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationUpdateUserSettingUseCase } from '@modules/notification/use-cases/notification.update-user-setting.use-case';

describe('NotificationUpdateUserSettingUseCase', () => {
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-id', 'actor@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    let useCase: NotificationUpdateUserSettingUseCase;

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module = await Test.createTestingModule({
            providers: [
                NotificationUpdateUserSettingUseCase,
                { provide: NotificationService, useValue: notificationService },
                { provide: DatabaseService, useValue: databaseService },
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

        it('updates the setting on the transaction tx after validating and returns an empty response', async () => {
            notificationService.updateUserSettingInTx.mockResolvedValue(
                undefined
            );

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                data
            );

            expect(result).toEqual({});
            expect(
                notificationService.validateUserSetting
            ).toHaveBeenCalledWith(data.type, data.channel);
            expect(
                notificationService.updateUserSettingInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                data
            );
        });

        it('throws the validation failure before any transaction opens', async () => {
            const failure = new NotificationInvalidTypeException();
            notificationService.validateUserSetting.mockImplementation(() => {
                throw failure;
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    data
                )
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                notificationService.updateUserSettingInTx
            ).not.toHaveBeenCalled();
        });

        it('rethrows the domain rejection of the write', async () => {
            const failure = new Error('write failed');
            notificationService.updateUserSettingInTx.mockRejectedValue(
                failure
            );

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
