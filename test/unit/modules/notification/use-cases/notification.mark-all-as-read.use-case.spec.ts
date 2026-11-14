import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationMarkAllAsReadUseCase } from '@modules/notification/use-cases/notification.mark-all-as-read.use-case';
import {
    buildUser,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('NotificationMarkAllAsReadUseCase', () => {
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const userContext = buildUserContext(
        buildUser('user-id', 'user@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    let useCase: NotificationMarkAllAsReadUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationMarkAllAsReadUseCase,
                { provide: NotificationService, useValue: notificationService },
            ],
        }).compile();
        useCase = module.get(NotificationMarkAllAsReadUseCase);
    });

    describe('execute', () => {
        it('returns the updated count as messageProperties metadata', async () => {
            notificationService.markAllAsRead.mockResolvedValue(4);

            const result = await useCase.execute(authContext);

            expect(notificationService.markAllAsRead).toHaveBeenCalledWith(
                'user-id'
            );
            expect(result).toEqual({
                metadata: { messageProperties: { count: 4 } },
            });
        });
    });
});
