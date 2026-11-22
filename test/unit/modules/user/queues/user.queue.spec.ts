import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import { UserQueue } from '@modules/user/queues/user.queue';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumAwsS3Accessibility,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { IActivityLogActorPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';

describe('UserQueue', () => {
    const userQueue: MockProxy<Queue> = mock<Queue>();
    let queue: UserQueue;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                UserQueue,
                {
                    provide: getQueueToken(EnumUserQueue.user),
                    useValue: userQueue,
                },
            ],
        }).compile();
        queue = module.get(UserQueue);
    });

    describe('deletePhotoEffect', () => {
        it('returns the low-priority deletePhoto effect carrying the user, key, and access and no business key', () => {
            const effect = queue.deletePhotoEffect('user-persimmon', {
                bucket: 'bucket',
                key: 'photo-profile/user-persimmon/previous.png',
                cdnUrl: null,
                completedUrl: 'https://cdn.example.com/previous.png',
                mime: 'image/png',
                extension: 'png',
                access: EnumAwsS3Accessibility.public,
            });

            expect(effect).toEqual({
                queue: EnumUserQueue.user,
                name: EnumUserProcess.deletePhoto,
                data: {
                    userId: 'user-persimmon',
                    key: 'photo-profile/user-persimmon/previous.png',
                    access: EnumAwsS3Accessibility.public,
                },
                priority: EnumQueuePriority.low,
                idempotencyKey: null,
            });
        });
    });

    describe('importByAdminEffect', () => {
        it('returns the medium-priority importByAdmin effect holding the rows and the activity payload given, created null, no business key', () => {
            const rows = [
                {
                    username: 'bramble2fox',
                    email: 'bramble@example.com',
                    name: null,
                },
            ];
            const activityLog: IActivityLogActorPayload = {
                actorUserId: 'admin-bramble',
                workspaceId: null,
                apiKeyId: 'api-key-1',
                requestLog: buildRequestContext().requestLog,
            };

            const effect = queue.importByAdminEffect(rows, activityLog);

            expect(effect).toEqual({
                queue: EnumUserQueue.user,
                name: EnumUserProcess.importByAdmin,
                data: { rows, activityLog, created: null },
                priority: EnumQueuePriority.medium,
                idempotencyKey: null,
            });
        });
    });

    describe('exportByAdminEffect', () => {
        it('returns the medium-priority exportByAdmin effect holding the filters and the activity payload given, exported null, no business key', () => {
            const activityLog: IActivityLogActorPayload = {
                actorUserId: 'admin-bramble',
                workspaceId: null,
                apiKeyId: 'api-key-1',
                requestLog: buildRequestContext().requestLog,
            };

            const effect = queue.exportByAdminEffect(
                [EnumUserStatus.active],
                'role-bramble',
                null,
                activityLog
            );

            expect(effect).toEqual({
                queue: EnumUserQueue.user,
                name: EnumUserProcess.exportByAdmin,
                data: {
                    status: [EnumUserStatus.active],
                    roleId: 'role-bramble',
                    countryId: null,
                    activityLog,
                    exported: null,
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: null,
            });
        });
    });

    describe('deleteSelfEffect', () => {
        it('returns the high-priority deleteSelf effect holding the user id, the owned workspace ids, and the activity payload only, no business key', () => {
            const activityLog: IActivityLogActorPayload = {
                actorUserId: 'user-bramble',
                workspaceId: null,
                apiKeyId: 'api-key-1',
                requestLog: buildRequestContext().requestLog,
            };

            const effect = queue.deleteSelfEffect(
                'user-bramble',
                ['workspace-one', 'workspace-two'],
                activityLog
            );

            expect(effect).toEqual({
                queue: EnumUserQueue.user,
                name: EnumUserProcess.deleteSelf,
                data: {
                    userId: 'user-bramble',
                    ownedWorkspaceIds: ['workspace-one', 'workspace-two'],
                    activityLog,
                },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });
    });
});
