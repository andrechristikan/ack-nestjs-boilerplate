import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationMarkAsReadUseCase } from '@modules/notification/use-cases/notification.mark-as-read.use-case';
import {
    buildRequestContextUser,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';

describe('NotificationMarkAsReadUseCase', () => {
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const context = buildRequestContextUser(
        buildUser('user-id', 'user@example.com')
    );
    let useCase: NotificationMarkAsReadUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationMarkAsReadUseCase,
                { provide: NotificationService, useValue: notificationService },
            ],
        }).compile();
        useCase = module.get(NotificationMarkAsReadUseCase);
    });

    describe('execute', () => {
        it('returns an empty response after marking the notification read', async () => {
            notificationService.markAsRead.mockResolvedValue(undefined);

            const result = await useCase.execute(context, 'notification-id');

            expect(notificationService.markAsRead).toHaveBeenCalledWith(
                'user-id',
                'notification-id'
            );
            expect(result).toEqual({});
        });
    });
});
