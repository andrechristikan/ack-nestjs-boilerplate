import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DeviceService } from '@modules/device/services/device.service';
import { SessionService } from '@modules/session/services/session.service';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { SessionProcessPurgeLoginsUseCase } from '@modules/session/use-cases/session.process-purge-logins.use-case';

describe('SessionProcessPurgeLoginsUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const now: Date = new Date('2026-01-01T00:00:00.000Z');
    const payload: ISessionPurgeLoginsPayload = {
        userId: 'user-1',
        sessions: [{ id: 'session-1' }, { id: 'session-2' }],
    };
    let useCase: SessionProcessPurgeLoginsUseCase;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                SessionProcessPurgeLoginsUseCase,
                { provide: SessionService, useValue: sessionService },
                { provide: DeviceService, useValue: deviceService },
                HelperDateService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(SessionProcessPurgeLoginsUseCase);
    });

    describe('execute', () => {
        it('hands the job sessions to the session domain and reports the count', async () => {
            const result = await useCase.execute(payload);

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

            const rejection = useCase.execute(payload);

            await expect(rejection).rejects.toBe(failure);
        });
    });
});
