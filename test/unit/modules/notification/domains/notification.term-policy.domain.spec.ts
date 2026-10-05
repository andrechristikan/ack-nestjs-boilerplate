import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import type {
    Notification,
    NotificationUserSetting,
    User,
} from '@generated/prisma-client/client';
import {
    EnumNotificationChannel,
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
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('NotificationTermPolicyDomain', () => {
    const notificationRepository: MockProxy<NotificationRepository> =
        mock<NotificationRepository>();
    const notificationUserSettingRepository: MockProxy<NotificationUserSettingRepository> =
        mock<NotificationUserSettingRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
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
    const data = { type: EnumTermPolicyType.privacy, version: 2 };
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

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, number> = { 'email.batchSize': 1 };

            return values[key];
        });
        const module = await Test.createTestingModule({
            providers: [
                NotificationTermPolicyDomain,
                {
                    provide: NotificationRepository,
                    useValue: notificationRepository,
                },
                {
                    provide: NotificationUserSettingRepository,
                    useValue: notificationUserSettingRepository,
                },
                { provide: UserDomain, useValue: userDomain },
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperArrayService,
                    useValue: helperArrayService,
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
        it('reports zero batches when no active user has an active transactional email setting', async () => {
            userDomain.getListActive.mockResolvedValue([
                { id: user.id, email: user.email, username: user.username },
            ]);
            notificationUserSettingRepository.findActiveUserSettingByType.mockResolvedValue(
                []
            );

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(result).toEqual({
                message: 'No users to send publish term policy notification',
                userCounts: 1,
                filteredUserCounts: 0,
                batches: 0,
            });
            expect(notificationRepository.createMany).not.toHaveBeenCalled();
        });

        it('chunks the filtered users and writes plus enqueues one batch per chunk', async () => {
            userDomain.getListActive.mockResolvedValue([
                { id: user.id, email: user.email, username: user.username },
            ]);
            const setting: NotificationUserSetting = {
                id: 'setting-id',
                userId: user.id,
                channel: EnumNotificationChannel.email,
                type: EnumNotificationType.transactional,
                isActive: true,
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2024-01-01T00:00:00.000Z'),
                updatedBy: null,
            };
            notificationUserSettingRepository.findActiveUserSettingByType.mockResolvedValue(
                [setting]
            );
            helperArrayService.chunk.mockReturnValue([
                [{ id: user.id, email: user.email, username: user.username }],
            ]);
            databaseUtil.createId.mockReturnValue('notification-id');
            notificationRepository.createMany.mockResolvedValue([notification]);
            notificationEmailQueue.sendPublishTermPolicy.mockResolvedValue(
                undefined
            );

            const result = await domain.processPublishTermPolicy(
                'admin-id',
                data
            );

            expect(
                notificationUserSettingRepository.findActiveUserSettingByType
            ).toHaveBeenCalledWith(
                [user.id],
                EnumNotificationType.transactional,
                [EnumNotificationChannel.email]
            );
            expect(notificationRepository.createMany).toHaveBeenCalledWith([
                {
                    kind: EnumNotificationKind.publishTermPolicy,
                    payload: {
                        id: 'notification-id',
                        userId: user.id,
                        metadata: { type: data.type, version: data.version },
                        createdBy: 'admin-id',
                    },
                },
            ]);
            expect(
                notificationEmailQueue.sendPublishTermPolicy
            ).toHaveBeenCalledWith(
                [
                    {
                        userId: user.id,
                        email: user.email,
                        username: user.username,
                        notificationId: 'notification-id',
                    },
                ],
                data
            );
            expect(result).toEqual({
                message: 'Publish term policy notification processed',
                userCounts: 1,
                filteredUserCounts: 1,
                batches: 1,
            });
        });
    });

    describe('processUserAcceptTermPolicy', () => {
        const acceptData = { ...data, termPolicyId: 'term-policy-id' };

        it('skips when the user is not active', async () => {
            userDomain.getOneActive.mockResolvedValue(null);

            const result = await domain.processUserAcceptTermPolicy(
                'user-id',
                acceptData
            );

            expect(result).toEqual({
                message:
                    'User not found, skipping user accept term policy notification',
            });
            expect(notificationRepository.create).not.toHaveBeenCalled();
        });

        it('writes the notification for an active user', async () => {
            userDomain.getOneActive.mockResolvedValue(user);
            databaseUtil.createId.mockReturnValue('notification-id');
            notificationRepository.create.mockResolvedValue(notification);

            const result = await domain.processUserAcceptTermPolicy(
                'user-id',
                acceptData
            );

            expect(notificationRepository.create).toHaveBeenCalledWith(
                EnumNotificationKind.userAcceptTermPolicy,
                {
                    id: 'notification-id',
                    userId: user.id,
                    metadata: {
                        username: user.username,
                        type: acceptData.type,
                        version: acceptData.version,
                    },
                    createdBy: user.id,
                }
            );
            expect(result).toEqual({
                message: 'User accept term policy notification processed',
            });
        });
    });
});
