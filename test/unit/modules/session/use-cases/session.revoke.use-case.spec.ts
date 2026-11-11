import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { SessionService } from '@modules/session/services/session.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { SessionRevokeUseCase } from '@modules/session/use-cases/session.revoke.use-case';

describe('SessionRevokeUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const selfActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userRevokeSession,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    let useCase: SessionRevokeUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionRevokeUseCase,
                { provide: SessionService, useValue: sessionService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        useCase = module.get(SessionRevokeUseCase);
    });

    describe('execute', () => {
        it('prepares the activity log, revokes, and stages the row', async () => {
            activityLogService.prepare.mockReturnValue(selfActivityLog);
            sessionService.revoke.mockResolvedValue();

            const result = await useCase.execute('user-1', 'session-1');

            expect(result).toEqual({});
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeSession,
            });
            expect(sessionService.revoke).toHaveBeenCalledWith(
                'user-1',
                'session-1'
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                selfActivityLog,
            ]);
        });

        it('stages nothing when the domain throws', async () => {
            activityLogService.prepare.mockReturnValue(selfActivityLog);
            const failure = new SessionNotFoundException();
            sessionService.revoke.mockRejectedValue(failure);

            const rejection = useCase.execute('user-1', 'session-1');

            await expect(rejection).rejects.toBe(failure);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
