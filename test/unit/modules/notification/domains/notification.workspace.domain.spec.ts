import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('NotificationWorkspaceDomain', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
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

    beforeEach(async () => {
        vi.resetAllMocks();
        databaseUtil.createId.mockReturnValue('notification-id');
        const module = await Test.createTestingModule({
            providers: [
                NotificationWorkspaceDomain,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                { provide: UserDomain, useValue: userDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: DatabaseUtil, useValue: databaseUtil },
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
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue(
                []
            );

            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                data
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping workspace invite notification',
            });
            expect(notificationRepository.create).not.toHaveBeenCalled();
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue(
                []
            );
            notificationRepository.create.mockResolvedValue(notification);
            notificationEmailQueue.sendWorkspaceInvite.mockResolvedValue(
                undefined
            );

            await domain.processWorkspaceInvite('user-id', 'admin-id', data);

            expect(
                notificationPushQueue.sendWorkspaceInvite
            ).not.toHaveBeenCalled();
        });

        it('writes the notification and enqueues email and push when a device has a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationRepository.create.mockResolvedValue(notification);
            notificationEmailQueue.sendWorkspaceInvite.mockResolvedValue(
                undefined
            );
            notificationPushQueue.sendWorkspaceInvite.mockResolvedValue(
                undefined
            );

            const result = await domain.processWorkspaceInvite(
                'user-id',
                'admin-id',
                data
            );

            expect(notificationRepository.create).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceInvite,
                {
                    id: 'notification-id',
                    userId: user.id,
                    metadata: {
                        username: user.username,
                        workspaceId: data.workspaceId,
                        workspaceName: data.workspaceName,
                        inviterName: data.inviterName,
                    },
                    createdBy: 'admin-id',
                }
            );
            expect(
                notificationEmailQueue.sendWorkspaceInvite
            ).toHaveBeenCalledWith(
                {
                    userId: user.id,
                    email: user.email,
                    username: user.username,
                    notificationId: 'notification-id',
                    cc: [],
                    bcc: [],
                },
                data
            );
            expect(
                notificationPushQueue.sendWorkspaceInvite
            ).toHaveBeenCalledWith(
                {
                    userId: 'user-id',
                    notificationId: 'notification-id',
                    notificationTokens: ['push-token'],
                    username: user.username,
                },
                {
                    workspaceId: data.workspaceId,
                    workspaceName: data.workspaceName,
                    inviterName: data.inviterName,
                    workspaceMemberRole: data.workspaceMemberRole,
                    reference: data.reference,
                    expiredAt: data.expiredAt,
                }
            );
            expect(result).toMatchObject({
                message: 'Workspace invite notification processed',
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
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue(
                []
            );

            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                data
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping workspace join request notification',
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue(
                []
            );
            notificationRepository.create.mockResolvedValue(notification);
            notificationEmailQueue.sendWorkspaceJoinRequest.mockResolvedValue(
                undefined
            );

            await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                data
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinRequest
            ).not.toHaveBeenCalled();
        });

        it('writes the notification and enqueues email and push when a device has a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationRepository.create.mockResolvedValue(notification);
            notificationEmailQueue.sendWorkspaceJoinRequest.mockResolvedValue(
                undefined
            );
            notificationPushQueue.sendWorkspaceJoinRequest.mockResolvedValue(
                undefined
            );

            const result = await domain.processWorkspaceJoinRequest(
                'user-id',
                'admin-id',
                data
            );

            expect(notificationRepository.create).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceJoinRequest,
                {
                    id: 'notification-id',
                    userId: user.id,
                    metadata: {
                        username: user.username,
                        workspaceId: data.workspaceId,
                        workspaceName: data.workspaceName,
                        requesterName: data.requesterName,
                    },
                    createdBy: 'admin-id',
                }
            );
            expect(
                notificationPushQueue.sendWorkspaceJoinRequest
            ).toHaveBeenCalledWith(
                {
                    userId: 'user-id',
                    notificationId: 'notification-id',
                    notificationTokens: ['push-token'],
                    username: user.username,
                },
                {
                    workspaceId: data.workspaceId,
                    workspaceName: data.workspaceName,
                    requesterName: data.requesterName,
                }
            );
            expect(result).toMatchObject({
                message: 'Workspace join request notification processed',
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
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue(
                []
            );

            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                data
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping workspace join accepted notification',
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue(
                []
            );
            notificationRepository.create.mockResolvedValue(notification);
            notificationEmailQueue.sendWorkspaceJoinAccepted.mockResolvedValue(
                undefined
            );

            await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                data
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinAccepted
            ).not.toHaveBeenCalled();
        });

        it('writes the notification and enqueues email and push when a device has a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationRepository.create.mockResolvedValue(notification);
            notificationEmailQueue.sendWorkspaceJoinAccepted.mockResolvedValue(
                undefined
            );
            notificationPushQueue.sendWorkspaceJoinAccepted.mockResolvedValue(
                undefined
            );

            const result = await domain.processWorkspaceJoinAccepted(
                'user-id',
                'admin-id',
                data
            );

            expect(notificationRepository.create).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceJoinAccepted,
                {
                    id: 'notification-id',
                    userId: user.id,
                    metadata: {
                        username: user.username,
                        workspaceId: data.workspaceId,
                        workspaceName: data.workspaceName,
                    },
                    createdBy: 'admin-id',
                }
            );
            expect(
                notificationPushQueue.sendWorkspaceJoinAccepted
            ).toHaveBeenCalledWith(
                {
                    userId: 'user-id',
                    notificationId: 'notification-id',
                    notificationTokens: ['push-token'],
                    username: user.username,
                },
                data
            );
            expect(result).toMatchObject({
                message: 'Workspace join accepted notification processed',
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
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue(
                []
            );

            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                data
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping workspace join rejected notification',
            });
        });

        it('does not enqueue a push when there is no device with a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue(
                []
            );
            notificationRepository.create.mockResolvedValue(notification);
            notificationEmailQueue.sendWorkspaceJoinRejected.mockResolvedValue(
                undefined
            );

            await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                data
            );

            expect(
                notificationPushQueue.sendWorkspaceJoinRejected
            ).not.toHaveBeenCalled();
        });

        it('writes the notification and enqueues email and push when a device has a token', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
                deviceOwnership,
            ]);
            notificationRepository.create.mockResolvedValue(notification);
            notificationEmailQueue.sendWorkspaceJoinRejected.mockResolvedValue(
                undefined
            );
            notificationPushQueue.sendWorkspaceJoinRejected.mockResolvedValue(
                undefined
            );

            const result = await domain.processWorkspaceJoinRejected(
                'user-id',
                'admin-id',
                data
            );

            expect(notificationRepository.create).toHaveBeenCalledWith(
                EnumNotificationKind.workspaceJoinRejected,
                {
                    id: 'notification-id',
                    userId: user.id,
                    metadata: {
                        username: user.username,
                        workspaceId: data.workspaceId,
                        workspaceName: data.workspaceName,
                        rejectReasonCode: data.rejectReasonCode,
                    },
                    createdBy: 'admin-id',
                }
            );
            expect(
                notificationPushQueue.sendWorkspaceJoinRejected
            ).toHaveBeenCalledWith(
                {
                    userId: 'user-id',
                    notificationId: 'notification-id',
                    notificationTokens: ['push-token'],
                    username: user.username,
                },
                data
            );
            expect(result).toMatchObject({
                message: 'Workspace join rejected notification processed',
            });
        });
    });
});
