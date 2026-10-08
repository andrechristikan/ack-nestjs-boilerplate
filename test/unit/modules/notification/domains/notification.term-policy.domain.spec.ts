import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { Notification, User } from '@generated/prisma-client/client';
import {
    EnumNotificationPriority,
    EnumNotificationType,
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { NotificationTermPolicyDomain } from '@modules/notification/domains/notification.term-policy.domain';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('NotificationTermPolicyDomain', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    let domain: NotificationTermPolicyDomain;

    const user: User = {
        id: 'user-1',
        name: 'Nadia Bloom',
        username: 'nadia',
        isVerified: true,
        verifiedAt: new Date('2024-01-01T00:00:00.000Z'),
        email: 'nadia@example.com',
        roleId: 'role-id',
        password: 'hashed',
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: 0,
        signUpAt: new Date('2024-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.female,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: true,
        },
        photo: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };
    const data = {
        termPolicyId: 'term-policy-id',
        type: EnumTermPolicyType.privacy,
        version: 2,
    };
    const notification: Notification = {
        id: 'notification-id',
        userId: user.id,
        type: EnumNotificationType.transactional,
        priority: EnumNotificationPriority.normal,
        title: 'Term policy published',
        body: 'A term policy was published',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: 'admin-id',
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const now = new Date('2024-01-03T00:00:00.000Z');

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, number> = { 'email.batchSize': 3 };

            return values[key];
        });
        const module = await Test.createTestingModule({
            providers: [
                NotificationTermPolicyDomain,
                NotificationUtil,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: UserDomain, useValue: userDomain },
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperDateService,
                    useValue: helperDateService,
                },
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
            ],
        }).compile();
        domain = module.get(NotificationTermPolicyDomain);
    });

    describe('processPublishTermPolicy', () => {
        const enqueuedAt = new Date('2024-01-02T00:00:00.000Z');

        it('creates, enqueues and marks one batch per page and stops on a short page', async () => {
            userDomain.getListIdCursor
                .mockResolvedValueOnce(['u1', 'u2', 'u3'])
                .mockResolvedValueOnce(['u4']);
            notificationRepository.findTermPolicyRecipients.mockResolvedValue(
                []
            );
            const calls: string[] = [];
            notificationRepository.createTermPolicyRecipients.mockImplementation(
                async () => {
                    calls.push('create');
                }
            );
            notificationEmailQueue.sendPublishTermPolicyBatch.mockImplementation(
                async () => {
                    calls.push('send');
                }
            );
            notificationRepository.markTermPolicyRecipientsEnqueued.mockImplementation(
                async () => {
                    calls.push('mark');
                }
            );
            databaseUtil.createId
                .mockReturnValueOnce('batch-1')
                .mockReturnValueOnce('n-1')
                .mockReturnValueOnce('n-2')
                .mockReturnValueOnce('n-3')
                .mockReturnValueOnce('batch-2')
                .mockReturnValueOnce('n-4');

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(userDomain.getListIdCursor).toHaveBeenNthCalledWith(
                1,
                null,
                3
            );
            expect(userDomain.getListIdCursor).toHaveBeenNthCalledWith(
                2,
                'u3',
                3
            );
            expect(userDomain.getListIdCursor).toHaveBeenCalledTimes(2);
            expect(
                notificationRepository.createTermPolicyRecipients
            ).toHaveBeenNthCalledWith(
                1,
                'admin-id',
                data.termPolicyId,
                'batch-1',
                [
                    {
                        kind: EnumNotificationKind.publishTermPolicy,
                        payload: {
                            id: 'n-1',
                            userId: 'u1',
                            metadata: {
                                type: data.type,
                                version: data.version,
                            },
                            createdBy: 'admin-id',
                        },
                    },
                    {
                        kind: EnumNotificationKind.publishTermPolicy,
                        payload: {
                            id: 'n-2',
                            userId: 'u2',
                            metadata: {
                                type: data.type,
                                version: data.version,
                            },
                            createdBy: 'admin-id',
                        },
                    },
                    {
                        kind: EnumNotificationKind.publishTermPolicy,
                        payload: {
                            id: 'n-3',
                            userId: 'u3',
                            metadata: {
                                type: data.type,
                                version: data.version,
                            },
                            createdBy: 'admin-id',
                        },
                    },
                ],
                [
                    { userId: 'u1', notificationId: 'n-1' },
                    { userId: 'u2', notificationId: 'n-2' },
                    { userId: 'u3', notificationId: 'n-3' },
                ]
            );
            expect(
                notificationRepository.createTermPolicyRecipients
            ).toHaveBeenNthCalledWith(
                2,
                'admin-id',
                data.termPolicyId,
                'batch-2',
                [
                    {
                        kind: EnumNotificationKind.publishTermPolicy,
                        payload: {
                            id: 'n-4',
                            userId: 'u4',
                            metadata: {
                                type: data.type,
                                version: data.version,
                            },
                            createdBy: 'admin-id',
                        },
                    },
                ],
                [{ userId: 'u4', notificationId: 'n-4' }]
            );
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenNthCalledWith(1, data, 'batch-1', 'admin-id', 0);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenNthCalledWith(2, data, 'batch-2', 'admin-id', 1);
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenNthCalledWith(
                1,
                data.termPolicyId,
                ['batch-1'],
                now,
                'admin-id'
            );
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenNthCalledWith(
                2,
                data.termPolicyId,
                ['batch-2'],
                now,
                'admin-id'
            );
            expect(calls).toEqual([
                'create',
                'send',
                'mark',
                'create',
                'send',
                'mark',
            ]);
            expect(result).toEqual({
                message: 'Publish term policy notification processed',
                candidateCounts: 4,
                createdCounts: 4,
                batches: 2,
            });
        });

        it('skips a candidate whose marker is already enqueued, creating and re-adding nothing', async () => {
            userDomain.getListIdCursor.mockResolvedValueOnce(['u1', 'u2']);
            notificationRepository.findTermPolicyRecipients.mockResolvedValue([
                { userId: 'u1', batchId: 'B0', enqueuedAt },
            ]);
            databaseUtil.createId
                .mockReturnValueOnce('batch-1')
                .mockReturnValueOnce('n-1');

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(
                notificationRepository.createTermPolicyRecipients
            ).toHaveBeenCalledWith(
                'admin-id',
                data.termPolicyId,
                'batch-1',
                [
                    {
                        kind: EnumNotificationKind.publishTermPolicy,
                        payload: {
                            id: 'n-1',
                            userId: 'u2',
                            metadata: {
                                type: data.type,
                                version: data.version,
                            },
                            createdBy: 'admin-id',
                        },
                    },
                ],
                [{ userId: 'u2', notificationId: 'n-1' }]
            );
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'batch-1', 'admin-id', 0);
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenCalledWith(
                data.termPolicyId,
                ['batch-1'],
                now,
                'admin-id'
            );
            expect(result).toEqual({
                message: 'Publish term policy notification processed',
                candidateCounts: 2,
                createdCounts: 1,
                batches: 1,
            });
        });

        it('re-adds every stored pending batch and the new batch, then marks all of them', async () => {
            userDomain.getListIdCursor
                .mockResolvedValueOnce(['u1', 'u2', 'u3'])
                .mockResolvedValueOnce([]);
            notificationRepository.findTermPolicyRecipients.mockResolvedValue([
                { userId: 'u1', batchId: 'B1', enqueuedAt: null },
                { userId: 'u2', batchId: 'B2', enqueuedAt: null },
            ]);
            databaseUtil.createId
                .mockReturnValueOnce('batch-1')
                .mockReturnValueOnce('n-1');

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(
                notificationRepository.createTermPolicyRecipients
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationRepository.createTermPolicyRecipients
            ).toHaveBeenCalledWith(
                'admin-id',
                data.termPolicyId,
                'batch-1',
                [
                    {
                        kind: EnumNotificationKind.publishTermPolicy,
                        payload: {
                            id: 'n-1',
                            userId: 'u3',
                            metadata: {
                                type: data.type,
                                version: data.version,
                            },
                            createdBy: 'admin-id',
                        },
                    },
                ],
                [{ userId: 'u3', notificationId: 'n-1' }]
            );
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledTimes(3);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'B1', 'admin-id', 0);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'B2', 'admin-id', 1);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'batch-1', 'admin-id', 2);
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenCalledWith(
                data.termPolicyId,
                ['B1', 'B2', 'batch-1'],
                now,
                'admin-id'
            );
            expect(result).toEqual({
                message: 'Publish term policy notification processed',
                candidateCounts: 3,
                createdCounts: 1,
                batches: 3,
            });
        });

        it('adds a stored batch split across two pages exactly once', async () => {
            userDomain.getListIdCursor
                .mockResolvedValueOnce(['u1', 'u2', 'u3'])
                .mockResolvedValueOnce(['u4']);
            notificationRepository.findTermPolicyRecipients
                .mockResolvedValueOnce([
                    { userId: 'u1', batchId: 'B', enqueuedAt: null },
                    { userId: 'u2', batchId: 'B', enqueuedAt: null },
                    { userId: 'u3', batchId: 'B', enqueuedAt: null },
                ])
                .mockResolvedValueOnce([
                    { userId: 'u4', batchId: 'B', enqueuedAt },
                ]);
            databaseUtil.createId.mockReturnValue('unused-id');

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).toHaveBeenCalledWith(data, 'B', 'admin-id', 0);
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).toHaveBeenCalledWith(data.termPolicyId, ['B'], now, 'admin-id');
            expect(
                notificationRepository.createTermPolicyRecipients
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Publish term policy notification processed',
                candidateCounts: 4,
                createdCounts: 0,
                batches: 1,
            });
        });

        it('advances the cursor past a full page whose candidates are all enqueued and writes nothing', async () => {
            userDomain.getListIdCursor
                .mockResolvedValueOnce(['u1', 'u2', 'u3'])
                .mockResolvedValueOnce([]);
            notificationRepository.findTermPolicyRecipients.mockResolvedValue([
                { userId: 'u1', batchId: 'B', enqueuedAt },
                { userId: 'u2', batchId: 'B', enqueuedAt },
                { userId: 'u3', batchId: 'B', enqueuedAt },
            ]);
            databaseUtil.createId.mockReturnValue('unused-id');

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(userDomain.getListIdCursor).toHaveBeenNthCalledWith(
                2,
                'u3',
                3
            );
            expect(userDomain.getListIdCursor).toHaveBeenCalledTimes(2);
            expect(
                notificationRepository.createTermPolicyRecipients
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).not.toHaveBeenCalled();
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Publish term policy notification processed',
                candidateCounts: 3,
                createdCounts: 0,
                batches: 0,
            });
        });

        it('returns zero counts and writes nothing when there is no candidate', async () => {
            userDomain.getListIdCursor.mockResolvedValueOnce([]);

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(
                notificationRepository.findTermPolicyRecipients
            ).not.toHaveBeenCalled();
            expect(
                notificationRepository.createTermPolicyRecipients
            ).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendPublishTermPolicyBatch
            ).not.toHaveBeenCalled();
            expect(
                notificationRepository.markTermPolicyRecipientsEnqueued
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Publish term policy notification processed',
                candidateCounts: 0,
                createdCounts: 0,
                batches: 0,
            });
        });
    });

    describe('processUserAcceptTermPolicy', () => {
        const acceptData = { ...data, termPolicyId: 'term-policy-id' };

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processUserAcceptTermPolicy(
                'user-id',
                acceptData,
                'n-1',
                []
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping user accept term policy notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        });

        it('creates the row with the job notification id and reports the step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processUserAcceptTermPolicy(
                'user-id',
                acceptData,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.userAcceptTermPolicy,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: {
                            username: user.username,
                            type: acceptData.type,
                            version: acceptData.version,
                        },
                        createdBy: user.id,
                    },
                },
            ]);
            expect(result).toEqual({
                message: 'User accept term policy notification processed',
                completedSteps: [EnumNotificationStep.createNotification],
                failedSteps: [],
            });
        });

        it('skips the create on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processUserAcceptTermPolicy(
                'user-id',
                acceptData,
                'n-1',
                [EnumNotificationStep.createNotification]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'User accept term policy notification processed',
                completedSteps: [EnumNotificationStep.createNotification],
                failedSteps: [],
            });
        });

        it('names the create step when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processUserAcceptTermPolicy(
                'user-id',
                acceptData,
                'n-1',
                []
            );

            expect(result).toEqual({
                message: 'User accept term policy notification failed',
                completedSteps: [],
                failedSteps: [
                    {
                        step: EnumNotificationStep.createNotification,
                        error: 'mongo',
                    },
                ],
            });
        });
    });
});
