import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserProfileDomain } from '@modules/user/domains/user.profile.domain';
import { EnumUserProcess } from '@modules/user/enums/user.enum';
import type { IUserDeletePhotoPayload } from '@modules/user/interfaces/user.interface';
import { UserProcessorService } from '@modules/user/services/processor/user.processor.service';
import { QueueException } from '@queues/exceptions/queue.exception';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';

describe('UserProcessorService', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const userProfileDomain: MockProxy<UserProfileDomain> =
        mock<UserProfileDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const revoked: ISessionRef[] = [{ id: 'session-1' }, { id: 'session-2' }];
    const payload: IUserDeletePhotoPayload = {
        userId: 'user-1',
        key: 'photo-profile/user-1/old.png',
        access: 'public',
    };
    let service: UserProcessorService;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        helperDateService.create.mockReturnValue(now);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                UserProcessorService,
                { provide: UserProfileDomain, useValue: userProfileDomain },
                { provide: UserDomain, useValue: userDomain },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
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

    describe('lockout', () => {
        it('deactivates the user and revokes its sessions and devices on one transaction, then purges the revoked sessions after commit', async () => {
            const calls: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userDomain.deactivateForMaxAttemptInTx.mockImplementation(
                async () => {
                    calls.push('deactivate');

                    return true;
                }
            );
            sessionDomain.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            deviceDomain.revokeAllByUserInTx.mockImplementation(async () => {
                calls.push('revokeDevices');
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                calls.push('purge');
            });

            const result = await service.lockout('user-1');

            expect(userDomain.deactivateForMaxAttemptInTx).toHaveBeenCalledWith(
                tx,
                'user-1'
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'user-1',
                now
            );
            expect(deviceDomain.revokeAllByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'user-1',
                now
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-1',
                revoked
            );
            expect(calls).toEqual([
                'begin',
                'deactivate',
                'revokeSessions',
                'revokeDevices',
                'commit',
                'purge',
            ]);
            expect(result).toEqual({
                message: 'user.queue.lockout',
                countSessions: 2,
            });
        });

        it('revokes nothing and hands no session to the purge when the account is already inactive', async () => {
            userDomain.deactivateForMaxAttemptInTx.mockResolvedValue(false);

            const result = await service.lockout('user-1');

            expect(sessionDomain.revokeActiveByUserInTx).not.toHaveBeenCalled();
            expect(deviceDomain.revokeAllByUserInTx).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith('user-1', []);
            expect(result).toEqual({
                message: 'user.queue.lockout',
                countSessions: 0,
            });
        });

        it('rethrows the transaction failure and purges nothing so BullMQ retries the job', async () => {
            const failure = new Error('database down');
            databaseService.withTransaction.mockRejectedValue(failure);

            const rejection = service.lockout('user-1');

            await expect(rejection).rejects.toBe(failure);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
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
