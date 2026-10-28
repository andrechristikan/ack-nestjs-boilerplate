import { UnrecoverableError } from 'bullmq';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import { SentryService } from '@common/sentry/services/sentry.service';
import { EnumUserProcess } from '@modules/user/enums/user.enum';
import { UserProcessor } from '@modules/user/processors/user.processor';
import { UserProcessorService } from '@modules/user/services/user.processor.service';
import { QueueException } from '@queues/exceptions/queue.exception';
import { buildProcessorJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';

describe('UserProcessor', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const userProcessorService: MockProxy<UserProcessorService> =
        mock<UserProcessorService>();
    let processor: UserProcessor;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);

        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                UserProcessor,
                {
                    provide: UserProcessorService,
                    useValue: userProcessorService,
                },
                { provide: SentryService, useValue: sentryService },
            ],
        }).compile();

        processor = module.get(UserProcessor);
    });

    describe('process', () => {
        it('returns the processor service result for the deletePhoto job', async () => {
            const job = buildProcessorJob({
                name: EnumUserProcess.deletePhoto,
            });
            userProcessorService.processDeletePhoto.mockResolvedValue({
                message: 'done',
            });

            const result = await processor.process(job);

            expect(result).toEqual({ message: 'done' });
        });

        it('throws the unknown-process exception the service builds for an unknown job name', async () => {
            const job = buildProcessorJob({ name: 'other' });
            const exception = new QueueException(
                'user.queue.error.unknownProcess',
                true
            );
            userProcessorService.processUnknown.mockImplementation(() => {
                throw exception;
            });

            await expect(processor.process(job)).rejects.toBe(exception);
            expect(userProcessorService.processUnknown).toHaveBeenCalledWith(
                'other'
            );
        });

        it('rethrows a typed application exception as is', async () => {
            const job = buildProcessorJob({
                name: EnumUserProcess.deletePhoto,
            });
            const error = new DatabaseUnavailableException();
            userProcessorService.processDeletePhoto.mockRejectedValue(error);

            const rejection = processor.process(job);

            await expect(rejection).rejects.toBe(error);
        });

        it('wraps a fatal QueueException in an UnrecoverableError that keeps it as the cause', async () => {
            const job = buildProcessorJob({
                name: EnumUserProcess.deletePhoto,
            });
            const error = new QueueException('bucket unknown', true);
            userProcessorService.processDeletePhoto.mockRejectedValue(error);

            const rejection = processor.process(job);

            await expect(rejection).rejects.toMatchObject({
                constructor: UnrecoverableError,
                message: 'bucket unknown',
                cause: error,
            });
        });

        it('rethrows a non-fatal QueueException as is', async () => {
            const job = buildProcessorJob({
                name: EnumUserProcess.deletePhoto,
            });
            const error = new QueueException('s3 down', false);
            userProcessorService.processDeletePhoto.mockRejectedValue(error);

            const rejection = processor.process(job);

            await expect(rejection).rejects.toBe(error);
        });

        it('wraps an unknown error in AppUnknownException', async () => {
            const job = buildProcessorJob({
                name: EnumUserProcess.deletePhoto,
            });
            const error = new Error('boom');
            userProcessorService.processDeletePhoto.mockRejectedValue(error);

            const rejection = processor.process(job);

            await expect(rejection).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });
});
