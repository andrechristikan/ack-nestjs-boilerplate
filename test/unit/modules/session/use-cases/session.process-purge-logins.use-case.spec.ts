import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DeviceService } from '@modules/device/services/device.service';
import { SessionService } from '@modules/session/services/session.service';
import { EnumSessionProcess } from '@modules/session/enums/session.enum';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { SessionProcessPurgeLoginsUseCase } from '@modules/session/use-cases/session.process-purge-logins.use-case';

describe('SessionProcessPurgeLoginsUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const now: Date = new Date('2026-01-01T00:00:00.000Z');
    const payload: ISessionPurgeLoginsPayload = {
        userId: 'user-1',
        sessions: [{ id: 'session-1' }, { id: 'session-2' }],
    };
    let useCase: SessionProcessPurgeLoginsUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        helperDateService.create.mockReturnValue(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                SessionProcessPurgeLoginsUseCase,
                { provide: SessionService, useValue: sessionService },
                { provide: DeviceService, useValue: deviceService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(SessionProcessPurgeLoginsUseCase);
    });

    describe('execute', () => {
        it('hands the job sessions to the session domain and reports the count', async () => {
            const job = buildQueueJob<
                ISessionPurgeLoginsPayload,
                unknown,
                EnumSessionProcess
            >(payload);

            const result = await useCase.execute(job);

            expect(sessionService.deleteLogins).toHaveBeenCalledWith('user-1', [
                { id: 'session-1' },
                { id: 'session-2' },
            ]);
            expect(
                deviceService.clearNotificationsWithoutLiveSession
            ).toHaveBeenCalledWith('user-1', now);
            expect(result).toEqual({
                message: 'session.queue.purgeLogins',
                countSessions: 2,
            });
        });

        it('rethrows the domain failure so BullMQ retries the job', async () => {
            const failure = new Error('redis down');
            sessionService.deleteLogins.mockRejectedValue(failure);
            const job = buildQueueJob<
                ISessionPurgeLoginsPayload,
                unknown,
                EnumSessionProcess
            >(payload);

            const rejection = useCase.execute(job);

            await expect(rejection).rejects.toBe(failure);
        });
    });
});
