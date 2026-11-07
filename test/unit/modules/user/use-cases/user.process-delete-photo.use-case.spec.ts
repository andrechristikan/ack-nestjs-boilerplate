import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { EnumUserProcess } from '@modules/user/enums/user.enum';
import type { IUserDeletePhotoPayload } from '@modules/user/interfaces/user.interface';
import { QueueException } from '@queues/exceptions/queue.exception';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';
import { UserProcessDeletePhotoUseCase } from '@modules/user/use-cases/user.process-delete-photo.use-case';

describe('UserProcessDeletePhotoUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();

    let useCase: UserProcessDeletePhotoUseCase;

    const payload: IUserDeletePhotoPayload = {
        userId: 'user-1',
        key: 'photo-profile/user-1/old.png',
        access: 'public',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                UserProcessDeletePhotoUseCase,
                { provide: UserProfileService, useValue: userProfileService },
            ],
        }).compile();

        useCase = module.get(UserProcessDeletePhotoUseCase);
    });

    describe('execute', () => {
        it('hands the photo key and its bucket access to the user profile domain and reports the key', async () => {
            const job = buildQueueJob<
                IUserDeletePhotoPayload,
                unknown,
                EnumUserProcess
            >(payload);

            const result = await useCase.execute(job);

            expect(userProfileService.deletePhotoObject).toHaveBeenCalledWith(
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
            userProfileService.deletePhotoObject.mockRejectedValue(failure);
            const job = buildQueueJob<
                IUserDeletePhotoPayload,
                unknown,
                EnumUserProcess
            >(payload);

            const rejection = useCase.execute(job);

            await expect(rejection).rejects.toBe(failure);
        });

        it('throws a fatal QueueException when the access names no bucket', async () => {
            const job = buildQueueJob<
                IUserDeletePhotoPayload,
                unknown,
                EnumUserProcess
            >({ ...payload, access: 'unknown' });

            const rejection = useCase.execute(job);

            await expect(rejection).rejects.toMatchObject({
                constructor: QueueException,
                isFatal: true,
            });
            expect(userProfileService.deletePhotoObject).not.toHaveBeenCalled();
        });
    });
});
