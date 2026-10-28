import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { UserProfileDomain } from '@modules/user/domains/user.profile.domain';
import { EnumUserProcess } from '@modules/user/enums/user.enum';
import type { IUserDeletePhotoPayload } from '@modules/user/interfaces/user.interface';
import { UserProcessorService } from '@modules/user/services/user.processor.service';
import { QueueException } from '@queues/exceptions/queue.exception';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';

describe('UserProcessorService', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const userProfileDomain: MockProxy<UserProfileDomain> =
        mock<UserProfileDomain>();
    const payload: IUserDeletePhotoPayload = {
        userId: 'user-1',
        key: 'photo-profile/user-1/old.png',
        access: 'public',
    };
    let service: UserProcessorService;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                UserProcessorService,
                { provide: UserProfileDomain, useValue: userProfileDomain },
            ],
        }).compile();

        service = module.get(UserProcessorService);
    });

    describe('processDeletePhoto', () => {
        it('hands the photo key and its bucket access to the user profile domain and reports the key', async () => {
            const job = buildQueueJob<
                IUserDeletePhotoPayload,
                unknown,
                EnumUserProcess
            >(payload);

            const result = await service.processDeletePhoto(job);

            expect(userProfileDomain.deletePhotoObject).toHaveBeenCalledWith(
                'photo-profile/user-1/old.png',
                EnumAwsS3Accessibility.public
            );
            expect(result).toEqual({
                message: 'user.queue.deletePhoto',
                key: 'photo-profile/user-1/old.png',
            });
        });

        it('rethrows the domain failure so BullMQ retries the job', async () => {
            const failure = new Error('s3 down');
            userProfileDomain.deletePhotoObject.mockRejectedValue(failure);
            const job = buildQueueJob<
                IUserDeletePhotoPayload,
                unknown,
                EnumUserProcess
            >(payload);

            const rejection = service.processDeletePhoto(job);

            await expect(rejection).rejects.toBe(failure);
        });

        it('throws a fatal QueueException when the access names no bucket', async () => {
            const job = buildQueueJob<
                IUserDeletePhotoPayload,
                unknown,
                EnumUserProcess
            >({ ...payload, access: 'unknown' });

            const rejection = service.processDeletePhoto(job);

            await expect(rejection).rejects.toMatchObject({
                constructor: QueueException,
                isFatal: true,
            });
            expect(userProfileDomain.deletePhotoObject).not.toHaveBeenCalled();
        });
    });

    describe('processUnknown', () => {
        it('throws a fatal QueueException naming the unknown process', () => {
            expect(() => service.processUnknown('unknownProcess')).toThrow(
                expect.objectContaining({
                    message: 'user.queue.error.unknownProcess',
                    isFatal: true,
                })
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'user.queue.error.unknownProcess',
                { properties: { process: 'unknownProcess' } }
            );
        });
    });
});
