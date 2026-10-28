import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { EnumSessionProcess } from '@modules/session/enums/session.enum';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import { SessionProcessorService } from '@modules/session/services/session.processor.service';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';

describe('SessionProcessorService', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const payload: ISessionPurgeLoginsPayload = {
        userId: 'user-1',
        sessions: [{ id: 'session-1' }, { id: 'session-2' }],
    };
    let service: SessionProcessorService;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                SessionProcessorService,
                { provide: SessionDomain, useValue: sessionDomain },
            ],
        }).compile();

        service = module.get(SessionProcessorService);
    });

    describe('processPurgeLogins', () => {
        it('hands the job sessions to the session domain and reports the count', async () => {
            const job = buildQueueJob<
                ISessionPurgeLoginsPayload,
                unknown,
                EnumSessionProcess
            >(payload);

            const result = await service.processPurgeLogins(job);

            expect(sessionDomain.deleteLogins).toHaveBeenCalledWith('user-1', [
                { id: 'session-1' },
                { id: 'session-2' },
            ]);
            expect(result).toEqual({
                message: 'session.queue.purgeLogins',
                countSessions: 2,
            });
        });

        it('rethrows the domain failure so BullMQ retries the job', async () => {
            const failure = new Error('redis down');
            sessionDomain.deleteLogins.mockRejectedValue(failure);
            const job = buildQueueJob<
                ISessionPurgeLoginsPayload,
                unknown,
                EnumSessionProcess
            >(payload);

            const rejection = service.processPurgeLogins(job);

            await expect(rejection).rejects.toBe(failure);
        });
    });

    describe('processUnknown', () => {
        it('throws a fatal QueueException naming the unknown process', () => {
            expect(() => service.processUnknown('unknownProcess')).toThrow(
                expect.objectContaining({
                    message: 'session.queue.error.unknownProcess',
                    isFatal: true,
                })
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'session.queue.error.unknownProcess',
                { properties: { process: 'unknownProcess' } }
            );
        });
    });
});
