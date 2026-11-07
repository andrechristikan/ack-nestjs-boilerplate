import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationMarkAsReadUseCase } from '@modules/notification/use-cases/notification.mark-as-read.use-case';

describe('NotificationMarkAsReadUseCase', () => {
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
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

            const result = await useCase.execute('user-id', 'notification-id');

            expect(notificationService.markAsRead).toHaveBeenCalledWith(
                'user-id',
                'notification-id'
            );
            expect(result).toEqual({});
        });
    });
});
