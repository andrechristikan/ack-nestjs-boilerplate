import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Notification, User } from '@generated/prisma-client/client';
import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
    EnumNotificationPriority,
    EnumNotificationType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import type { IDeviceOwnershipWithDevice } from '@modules/device/interfaces/device.interface';
import { NotificationWorkspaceDomain } from '@modules/notification/domains/notification.workspace.domain';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('NotificationWorkspaceDomain', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const notificationPushQueue: MockProxy<NotificationPushQueue> =
        mock<NotificationPushQueue>();
    let domain: NotificationWorkspaceDomain;

    const user: User = {
        id: 'user-id',
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

    const deviceOwnership: IDeviceOwnershipWithDevice = {
        id: 'ownership-id',
        deviceId: 'device-id',
        userId: 'user-id',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: new Date('2024-01-01T00:00:00.000Z'),
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
        device: {
            id: 'device-id',
            fingerprint: 'fingerprint-1',
            name: 'iPhone',
            platform: EnumDevicePlatform.ios,
            lastActiveAt: new Date('2024-01-01T00:00:00.000Z'),
            notificationToken: 'push-token',
            notificationProvider: EnumDeviceNotificationProvider.fcm,
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2024-01-01T00:00:00.000Z'),
            updatedBy: null,
        },
    };

    const notification: Notification = {
        id: 'notification-id',
        userId: 'user-id',
        type: EnumNotificationType.transactional,
        priority: EnumNotificationPriority.normal,
        title: 'Workspace notification',
        body: 'Workspace activity',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const emailPayload = {
        userId: 'user-id',
        email: user.email,
        username: user.username,
        notificationId: 'n-1',
        cc: [],
        bcc: [],
    };
    const pushPayload = {
        userId: 'user-id',
        notificationId: 'n-1',
        notificationTokens: ['push-token'],
        username: user.username,
    };
    const allSteps = [
        EnumNotificationStep.createNotification,
        EnumNotificationStep.sendEmail,
        EnumNotificationStep.sendPush,
    ];

    beforeEach(async () => {
        vi.resetAllMocks();
        notificationRepository.createMany.mockResolvedValue([notification]);
        deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([]);
        const module = await Test.createTestingModule({
            providers: [
                NotificationWorkspaceDomain,
                NotificationUtil,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: UserDomain, useValue: userDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
                {
                    provide: NotificationPushQueue,
                    useValue: notificationPushQueue,
                },
            ],
        }).compile();
        domain = module.get(NotificationWorkspaceDomain);
    });

    describe('processWorkspaceInvite', () => {
        const data: INotificationWorkspaceInviteEncryptedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            inviterName: 'Omar',
            workspaceMemberRole: EnumWorkspaceMemberRole.member,
            encryptedInviteAcceptLink: 'cipher-link',
            reference: 'ref-1',
            expiredAt: '2024-02-01T00:00:00.000Z',
        };

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping workspace invite notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        });

        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.workspaceInvite,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: {
                            username: user.username,
                            workspaceId: data.workspaceId,
                            workspaceName: data.workspaceName,
                            inviterName: data.inviterName,
                        },
                        createdBy: 'admin-id',
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendWorkspaceInvite
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(
                notificationPushQueue.sendWorkspaceInvite
            ).toHaveBeenCalledWith(pushPayload, {
                workspaceId: data.workspaceId,
                workspaceName: data.workspaceName,
                inviterName: data.inviterName,
                workspaceMemberRole: data.workspaceMemberRole,
                reference: data.reference,
                expiredAt: data.expiredAt,
            });
            expect(result).toEqual({
                message: 'Workspace invite notification processed',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                data,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceInvite
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendWorkspaceInvite
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect and still runs the others', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationEmailQueue.sendWorkspaceInvite.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceInvite
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendPush,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Workspace invite notification failed',
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

    describe('processWorkspaceJoinRequest', () => {
        const data: INotificationWorkspaceJoinRequestEncryptedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            requesterName: 'Omar',
            encryptedJoinRequestReviewLink: 'cipher-review-link',
        };

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping workspace join request notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        });

        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.workspaceJoinRequest,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: {
                            username: user.username,
                            workspaceId: data.workspaceId,
                            workspaceName: data.workspaceName,
                            requesterName: data.requesterName,
                        },
                        createdBy: 'admin-id',
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinRequest
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(
                notificationPushQueue.sendWorkspaceJoinRequest
            ).toHaveBeenCalledWith(pushPayload, {
                workspaceId: data.workspaceId,
                workspaceName: data.workspaceName,
                requesterName: data.requesterName,
            });
            expect(result).toEqual({
                message: 'Workspace join request notification processed',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinRequest
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                data,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceJoinRequest
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinRequest
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinRequest
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect and still runs the others', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationEmailQueue.sendWorkspaceJoinRequest.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinRequest
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendPush,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendWorkspaceJoinRequest
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinRequest
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Workspace join request notification failed',
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

    describe('processWorkspaceJoinAccepted', () => {
        const data: INotificationWorkspaceJoinAcceptedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
        };

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping workspace join accepted notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        });

        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.workspaceJoinAccepted,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: {
                            username: user.username,
                            workspaceId: data.workspaceId,
                            workspaceName: data.workspaceName,
                        },
                        createdBy: 'admin-id',
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinAccepted
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(
                notificationPushQueue.sendWorkspaceJoinAccepted
            ).toHaveBeenCalledWith(pushPayload, data);
            expect(result).toEqual({
                message: 'Workspace join accepted notification processed',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                data,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinAccepted
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinAccepted
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect and still runs the others', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationEmailQueue.sendWorkspaceJoinAccepted.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinAccepted
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendPush,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Workspace join accepted notification failed',
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

    describe('processWorkspaceJoinRejected', () => {
        const data: INotificationWorkspaceJoinRejectedPayload = {
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            rejectReasonCode: EnumWorkspaceJoinRejectReason.memberLimitReached,
        };

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping workspace join rejected notification',
                completedSteps: [],
                failedSteps: [],
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        });

        it('creates the row, then enqueues email and push, and reports every step completed', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.workspaceJoinRejected,
                    payload: {
                        id: 'n-1',
                        userId: user.id,
                        metadata: {
                            username: user.username,
                            workspaceId: data.workspaceId,
                            workspaceName: data.workspaceName,
                            rejectReasonCode: data.rejectReasonCode,
                        },
                        createdBy: 'admin-id',
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinRejected
            ).toHaveBeenCalledWith(emailPayload, data);
            expect(
                notificationPushQueue.sendWorkspaceJoinRejected
            ).toHaveBeenCalledWith(pushPayload, data);
            expect(result).toEqual({
                message: 'Workspace join rejected notification processed',
                completedSteps: allSteps,
                failedSteps: [],
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);

            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendEmail,
            ]);
        });

        it('skips the completed steps on a retry', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);

            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                data,
                'n-1',
                [
                    EnumNotificationStep.createNotification,
                    EnumNotificationStep.sendEmail,
                ]
            );

            expect(notificationRepository.createMany).not.toHaveBeenCalled();
            expect(
                notificationEmailQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinRejected
            ).toHaveBeenCalledTimes(1);
            expect(result.completedSteps).toEqual(allSteps);
        });

        it('continues when the rows already exist and the progress is empty', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            notificationRepository.createMany.mockResolvedValue([notification]);

            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(result.failedSteps).toEqual([]);
            expect(
                notificationEmailQueue.sendWorkspaceJoinRejected
            ).toHaveBeenCalledTimes(1);
        });

        it('names a rejected side effect and still runs the others', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationEmailQueue.sendWorkspaceJoinRejected.mockRejectedValue(
                new Error('redis')
            );

            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinRejected
            ).toHaveBeenCalledTimes(1);
            expect(result.failedSteps).toEqual([
                { step: EnumNotificationStep.sendEmail, error: 'redis' },
            ]);
            expect(result.completedSteps).toEqual([
                EnumNotificationStep.createNotification,
                EnumNotificationStep.sendPush,
            ]);
        });

        it('stops at the create gate when the rows cannot be written', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationRepository.createMany.mockRejectedValue(
                new Error('mongo')
            );

            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                data,
                'n-1',
                []
            );

            expect(
                notificationEmailQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
            expect(
                notificationPushQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Workspace join rejected notification failed',
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
