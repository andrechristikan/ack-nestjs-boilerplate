import { buildTermPolicyMarker } from '@test/unit/helpers/test.unit.notification-term-policy.helper';
import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import type { NotificationUserSetting } from '@generated/prisma-client/client';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

describe('NotificationUtil', () => {
    const settingBase: NotificationUserSetting = {
        id: 'setting-id',
        userId: 'user-id',
        channel: EnumNotificationChannel.email,
        type: EnumNotificationType.userActivity,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        createdBy: 'user-id',
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    let util: NotificationUtil;

    beforeEach(() => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        vi.mocked(configService.get).mockReturnValue('secret-key');
        util = new NotificationUtil(
            configService,
            helperEncryptionService,
            messageService
        );
    });

    describe('toStepFailure', () => {
        it('keeps an Error reason as the raw error', () => {
            const rawError = new Error('down');

            const failure = util.toStepFailure(
                EnumNotificationStep.sendEmail,
                rawError
            );

            expect(failure).toEqual({
                step: EnumNotificationStep.sendEmail,
                rawError,
            });
            expect(failure.rawError).toBe(rawError);
        });

        it('wraps a non-Error reason into an Error carrying its string form', () => {
            const failure = util.toStepFailure(
                EnumNotificationStep.sendPush,
                'boom'
            );

            expect(failure.step).toBe(EnumNotificationStep.sendPush);
            expect(failure.rawError).toBeInstanceOf(Error);
            expect(failure.rawError.message).toBe('boom');
        });
    });

    describe('toStepSummary', () => {
        it('summarizes failed steps by step name only', () => {
            messageService.setMessage.mockImplementation(
                (path: string, options) =>
                    `${path}|${String(options?.properties?.steps)}`
            );

            expect(
                util.toStepSummary([
                    {
                        step: EnumNotificationStep.sendEmail,
                        rawError: new Error('prisma secret'),
                    },
                    {
                        step: EnumNotificationStep.sendPush,
                        rawError: new Error('boom'),
                    },
                ])
            ).toBe(
                `notification.queue.error.stepsFailed|${EnumNotificationStep.sendEmail}, ${EnumNotificationStep.sendPush}`
            );
        });
    });

    describe('toStepResponse', () => {
        it('shapes the success response with the completed steps', () => {
            expect(
                util.toStepResponse({
                    message: 'done',
                    completedSteps: [EnumNotificationStep.createNotification],
                    failedSteps: [],
                })
            ).toEqual({
                message: 'done',
                completedSteps: [EnumNotificationStep.createNotification],
            });
        });
    });

    describe('listConfigurableSettings', () => {
        it('keeps the contract pairs and drops every other pair', () => {
            const kept = [
                {
                    ...settingBase,
                    type: EnumNotificationType.userActivity,
                    channel: EnumNotificationChannel.email,
                },
                {
                    ...settingBase,
                    type: EnumNotificationType.userActivity,
                    channel: EnumNotificationChannel.inApp,
                },
                {
                    ...settingBase,
                    type: EnumNotificationType.userActivity,
                    channel: EnumNotificationChannel.push,
                },
                {
                    ...settingBase,
                    type: EnumNotificationType.marketing,
                    channel: EnumNotificationChannel.email,
                },
                {
                    ...settingBase,
                    type: EnumNotificationType.marketing,
                    channel: EnumNotificationChannel.push,
                },
            ];
            const dropped = [
                {
                    ...settingBase,
                    type: EnumNotificationType.userActivity,
                    channel: EnumNotificationChannel.silent,
                },
                {
                    ...settingBase,
                    type: EnumNotificationType.securityAlert,
                    channel: EnumNotificationChannel.email,
                },
                {
                    ...settingBase,
                    type: EnumNotificationType.marketing,
                    channel: EnumNotificationChannel.inApp,
                },
            ];

            const result = util.listConfigurableSettings([...dropped, ...kept]);

            expect(result).toEqual(kept);
        });
    });

    describe('resolveChannels', () => {
        const userActivityEmailOff = {
            type: EnumNotificationType.userActivity,
            channel: EnumNotificationChannel.email,
            isActive: false,
        };
        const userActivityInAppOff = {
            type: EnumNotificationType.userActivity,
            channel: EnumNotificationChannel.inApp,
            isActive: false,
        };
        const securityAlertEmailOff = {
            type: EnumNotificationType.securityAlert,
            channel: EnumNotificationChannel.email,
            isActive: false,
        };
        const marketingEmailOff = {
            type: EnumNotificationType.marketing,
            channel: EnumNotificationChannel.email,
            isActive: false,
        };

        it('returns every contract channel when the user has no setting rows', () => {
            expect(
                util.resolveChannels(EnumNotificationKind.workspaceInvite, [])
            ).toEqual([
                ...NotificationKindContract.workspaceInvite.pendingChannels,
                ...NotificationKindContract.workspaceInvite.deliveredChannels,
            ]);
        });

        it('drops a channel the user disabled for a configurable type', () => {
            const channels = util.resolveChannels(
                EnumNotificationKind.workspaceInvite,
                [userActivityEmailOff]
            );
            expect(channels).not.toContain(EnumNotificationChannel.email);
        });

        it('drops inApp when disabled and keeps silent', () => {
            const channels = util.resolveChannels(
                EnumNotificationKind.welcome,
                [userActivityInAppOff]
            );
            expect(channels).not.toContain(EnumNotificationChannel.inApp);
            expect(channels).toContain(EnumNotificationChannel.silent);
        });

        it('returns no channel when only silent survives the disabled settings', () => {
            expect(
                util.resolveChannels(EnumNotificationKind.welcome, [
                    userActivityEmailOff,
                    userActivityInAppOff,
                ])
            ).toEqual([]);
        });

        it('ignores settings for a mandatory kind', () => {
            expect(
                util.resolveChannels(EnumNotificationKind.verificationEmail, [
                    userActivityEmailOff,
                ])
            ).toContain(EnumNotificationChannel.email);
        });

        it('ignores settings for a non-configurable type', () => {
            expect(
                util.resolveChannels(EnumNotificationKind.newDeviceLogin, [
                    securityAlertEmailOff,
                ])
            ).toContain(EnumNotificationChannel.email);
        });

        it('ignores a disabled row of another type', () => {
            expect(
                util.resolveChannels(EnumNotificationKind.workspaceInvite, [
                    marketingEmailOff,
                ])
            ).toContain(EnumNotificationChannel.email);
        });
    });

    describe('foldStepOutcomes', () => {
        it('splits fulfilled steps from rejected ones by position', () => {
            const rawError = new Error('down');
            const folded = util.foldStepOutcomes(
                [EnumNotificationStep.sendEmail, EnumNotificationStep.sendPush],
                [
                    { status: 'fulfilled', value: undefined },
                    { status: 'rejected', reason: rawError },
                ]
            );

            expect(folded).toEqual({
                completedSteps: [EnumNotificationStep.sendEmail],
                failedSteps: [
                    {
                        step: EnumNotificationStep.sendPush,
                        rawError,
                    },
                ],
            });
        });

        it('returns both lists empty for no outcome', () => {
            expect(util.foldStepOutcomes([], [])).toEqual({
                completedSteps: [],
                failedSteps: [],
            });
        });
    });

    describe('decryptPayload', () => {
        it('decrypts with the encryption secret and the notification purpose bound to the context', () => {
            helperEncryptionService.aes256Decrypt.mockReturnValue('plain');

            expect(util.decryptPayload('cipher', 'user-id')).toBe('plain');
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'cipher',
                'secret-key',
                'notification.payload',
                'user-id'
            );
        });
    });

    describe('decryptFailureTokens', () => {
        it('decrypts each failure token with the user id', () => {
            helperEncryptionService.aes256Decrypt.mockImplementation(
                (encrypted: string) =>
                    encrypted.replace(/^cipher\((.*)\)$/, '$1')
            );

            expect(
                util.decryptFailureTokens('user-id', [
                    'cipher(token-1)',
                    'cipher(token-2)',
                ])
            ).toEqual(['token-1', 'token-2']);
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'cipher(token-2)',
                'secret-key',
                'notification.payload',
                'user-id'
            );
        });

        it('rethrows a decryption failure', () => {
            const failure = new Error('decrypt');
            helperEncryptionService.aes256Decrypt.mockImplementation(() => {
                throw failure;
            });

            expect(() =>
                util.decryptFailureTokens('user-id', ['cipher(token-1)'])
            ).toThrow(failure);
        });
    });

    describe('toTokenPairs', () => {
        it('pairs each encrypted token with its plain token decrypted for the user', () => {
            helperEncryptionService.aes256Decrypt.mockImplementation(
                (encrypted: string) =>
                    encrypted.replace(/^cipher\((.*)\)$/, '$1')
            );

            expect(
                util.toTokenPairs('user-id', [
                    'cipher(token-1)',
                    'cipher(token-2)',
                ])
            ).toEqual([
                { encrypted: 'cipher(token-1)', token: 'token-1' },
                { encrypted: 'cipher(token-2)', token: 'token-2' },
            ]);
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'cipher(token-1)',
                'secret-key',
                'notification.payload',
                'user-id'
            );
        });

        it('rethrows a decryption failure', () => {
            const failure = new Error('decrypt');
            helperEncryptionService.aes256Decrypt.mockImplementation(() => {
                throw failure;
            });

            expect(() =>
                util.toTokenPairs('user-id', ['cipher(token-1)'])
            ).toThrow(failure);
        });
    });

    describe('toMulticastOutcome', () => {
        const pairs = [
            { encrypted: 'cipher(token-1)', token: 'token-1' },
            { encrypted: 'cipher(token-2)', token: 'token-2' },
        ];

        it('maps the failure tokens back to their ciphertexts with no failure when none is pending', () => {
            const outcome = util.toMulticastOutcome(
                pairs,
                {
                    successCount: 1,
                    failureCount: 1,
                    failureTokens: ['token-1'],
                    retryTokens: [],
                },
                null
            );

            expect(outcome).toEqual({
                encryptedFailureTokens: ['cipher(token-1)'],
                encryptedPendingTokens: [],
                failure: null,
            });
            expect(messageService.setMessage).not.toHaveBeenCalled();
        });

        it('merges the recorded failure tokens and drops duplicates', () => {
            const outcome = util.toMulticastOutcome(
                pairs,
                {
                    successCount: 1,
                    failureCount: 1,
                    failureTokens: ['token-1'],
                    retryTokens: [],
                },
                ['cipher(old)', 'cipher(token-1)']
            );

            expect(outcome.encryptedFailureTokens).toEqual([
                'cipher(old)',
                'cipher(token-1)',
            ]);
        });

        it('keeps the retry tokens as pending and fails the multicast step', () => {
            const outcome = util.toMulticastOutcome(
                pairs,
                {
                    successCount: 0,
                    failureCount: 2,
                    failureTokens: [],
                    retryTokens: ['token-1', 'token-2'],
                },
                null
            );

            expect(outcome).toEqual({
                encryptedFailureTokens: [],
                encryptedPendingTokens: ['cipher(token-1)', 'cipher(token-2)'],
                failure: {
                    step: EnumNotificationStep.sendMulticast,
                    rawError: new Error(
                        'notification.queue.push.error.tokensPending'
                    ),
                },
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.queue.push.error.tokensPending',
                { properties: { count: 2 } }
            );
        });
    });

    describe('toCleanupTokensResult', () => {
        it('reports the requested and removed counts', () => {
            expect(util.toCleanupTokensResult(2, 1)).toEqual({
                message: 'notification.queue.push.cleanupTokens',
                countRequestedTokens: 2,
                countRemovedTokens: 1,
            });
        });
    });

    describe('toCleanupStaleTokensResult', () => {
        it('reports the removed count', () => {
            expect(util.toCleanupStaleTokensResult(5)).toEqual({
                message: 'notification.queue.push.cleanupStaleTokens',
                countRemovedTokens: 5,
            });
        });
    });

    describe('toBulkDestination', () => {
        it('decrypts the recipient email with the user id and carries the username as template data', () => {
            helperEncryptionService.aes256Decrypt.mockReturnValue(
                'nadia@example.com'
            );

            expect(
                util.toBulkDestination({
                    userId: 'user-id',
                    notificationId: 'n-1',
                    encryptedEmail: 'cipher',
                    username: 'nadia',
                })
            ).toEqual({
                recipient: 'nadia@example.com',
                templateData: { username: 'nadia' },
            });
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'cipher',
                'secret-key',
                'notification.payload',
                'user-id'
            );
        });
    });

    describe('toNoChannelResult', () => {
        it('names the process in the message and keeps the completed steps with no failure', () => {
            const result = util.toNoChannelResult(
                EnumNotificationProcess.welcomeByAdmin,
                [EnumNotificationStep.createNotification]
            );

            expect(result).toEqual({
                message: 'notification.queue.error.noChannel',
                completedSteps: [EnumNotificationStep.createNotification],
                failedSteps: [],
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.queue.error.noChannel',
                {
                    properties: {
                        process: EnumNotificationProcess.welcomeByAdmin,
                    },
                }
            );
        });
    });

    describe('toDeliveryUnknownMessage', () => {
        it('names the batch and the unknown count in the delivery-unknown message', () => {
            messageService.setMessage.mockImplementation(
                (path: string, options) =>
                    `${path}|${String(options?.properties?.batchId)}|${String(options?.properties?.unknownCount)}`
            );

            const message = util.toDeliveryUnknownMessage('batch-id', 2);

            expect(message).toBe(
                'notification.queue.email.error.deliveryUnknown|batch-id|2'
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.queue.email.error.deliveryUnknown',
                { properties: { batchId: 'batch-id', unknownCount: 2 } }
            );
        });
    });

    describe('listPendingBatchIds', () => {
        const users = [
            { id: 'u1', email: 'u1@example.com', username: 'u1' },
            { id: 'u2', email: 'u2@example.com', username: 'u2' },
            { id: 'u3', email: 'u3@example.com', username: 'u3' },
        ];
        it('returns the distinct batch ids of the page users whose marker is unsent and unclaimed', () => {
            expect(
                util.listPendingBatchIds(users, [
                    buildTermPolicyMarker('u1', 'b1', null, null),
                    buildTermPolicyMarker('u2', 'b1', null, null),
                    buildTermPolicyMarker('u3', 'b2', new Date(), null),
                ])
            ).toEqual(['b1']);
        });

        it('skips a claimed marker and a marker of a user off the page', () => {
            expect(
                util.listPendingBatchIds(users, [
                    buildTermPolicyMarker('u1', 'b1', null, new Date()),
                    buildTermPolicyMarker('u9', 'b3', null, null),
                ])
            ).toEqual([]);
        });
    });

    describe('mapRecipient', () => {
        const user = {
            id: 'user-id',
            email: 'nadia@example.com',
            username: 'nadia',
        };

        it('snapshots the identity, the distinct non-null tokens, and the kind channels left by the settings', () => {
            const result = util.mapRecipient(
                user,
                EnumNotificationKind.workspaceInvite,
                ['t1', null, 't1', 't2'],
                [
                    {
                        type: EnumNotificationType.userActivity,
                        channel: EnumNotificationChannel.email,
                        isActive: false,
                    },
                ]
            );

            expect(result).toMatchObject({
                userId: 'user-id',
                email: 'nadia@example.com',
                username: 'nadia',
                notificationTokens: ['t1', 't2'],
            });
            expect(result.channels).not.toContain(
                EnumNotificationChannel.email
            );
            expect(result.channels).toContain(EnumNotificationChannel.push);
        });

        it('gives every kind channel for a user with no token and no setting', () => {
            expect(
                util.mapRecipient(user, EnumNotificationKind.welcome, [], [])
            ).toStrictEqual({
                userId: 'user-id',
                email: 'nadia@example.com',
                username: 'nadia',
                notificationTokens: [],
                channels: util.resolveChannels(
                    EnumNotificationKind.welcome,
                    []
                ),
            });
        });
    });

    describe('listMutedInAppTypes', () => {
        it('returns the types whose inApp setting is inactive', () => {
            expect(
                util.listMutedInAppTypes([
                    {
                        type: EnumNotificationType.userActivity,
                        channel: EnumNotificationChannel.inApp,
                        isActive: false,
                    },
                    {
                        type: EnumNotificationType.marketing,
                        channel: EnumNotificationChannel.email,
                        isActive: false,
                    },
                    {
                        type: EnumNotificationType.securityAlert,
                        channel: EnumNotificationChannel.inApp,
                        isActive: true,
                    },
                ])
            ).toEqual([EnumNotificationType.userActivity]);
        });
    });

    describe('toMessageProperties', () => {
        it('keeps only the primitive metadata values', () => {
            expect(
                util.toMessageProperties({
                    username: 'ana',
                    age: 3,
                    isNew: true,
                    nested: { a: 1 },
                    list: [1],
                    missing: null,
                })
            ).toEqual({ username: 'ana', age: 3, isNew: true });
        });

        it('returns empty properties for null metadata', () => {
            expect(util.toMessageProperties(null)).toEqual({});
        });

        it('returns empty properties for array metadata', () => {
            expect(util.toMessageProperties(['ana'])).toEqual({});
        });

        it('returns empty properties for primitive metadata', () => {
            expect(util.toMessageProperties('ana')).toEqual({});
        });
    });

    describe('toRejectReasonProperties', () => {
        it('adds the reject reason label translated in the request language', () => {
            messageService.setMessage.mockImplementation(
                (path: string) => `translated:${path}`
            );

            expect(
                util.toRejectReasonProperties(
                    { username: 'ana', rejectReasonCode: 'spam' },
                    'en'
                )
            ).toEqual({
                username: 'ana',
                rejectReasonCode: 'spam',
                rejectReasonLabel: 'translated:notification.rejectReason.spam',
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.rejectReason.spam',
                { customLanguage: 'en' }
            );
        });

        it('translates the label with no custom language when none is given', () => {
            util.toRejectReasonProperties({ rejectReasonCode: 'spam' }, null);

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.rejectReason.spam',
                {}
            );
        });

        it('returns the properties untouched when no reject reason code is a string', () => {
            const properties = { username: 'ana', rejectReasonCode: 3 };

            expect(util.toRejectReasonProperties(properties, 'en')).toBe(
                properties
            );
            expect(messageService.setMessage).not.toHaveBeenCalled();
        });
    });

    describe('toTemplateLabel', () => {
        it.each([
            [EnumNotificationProcess.welcome, 'welcome'],
            [EnumNotificationProcess.welcomeSocial, 'welcome social'],
            [EnumNotificationProcess.welcomeByAdmin, 'welcome by admin'],
            [EnumNotificationProcess.verificationEmail, 'verification email'],
            [EnumNotificationProcess.verifiedEmail, 'verified email'],
            [
                EnumNotificationProcess.verifiedMobileNumber,
                'verified mobile number',
            ],
            [EnumNotificationProcess.changePassword, 'change password'],
            [
                EnumNotificationProcess.temporaryPasswordByAdmin,
                'temporary password by admin',
            ],
            [EnumNotificationProcess.resetPassword, 'reset password'],
            [EnumNotificationProcess.forgotPassword, 'forgot password'],
            [
                EnumNotificationProcess.resetTwoFactorByAdmin,
                'reset two factor by admin',
            ],
            [EnumNotificationProcess.newDeviceLogin, 'new device login'],
            [EnumNotificationProcess.publishTermPolicy, 'publish term policy'],
            [EnumNotificationProcess.workspaceInvite, 'workspace invite'],
            [
                EnumNotificationProcess.workspaceJoinRequest,
                'workspace join request',
            ],
            [
                EnumNotificationProcess.workspaceJoinAccepted,
                'workspace join accepted',
            ],
            [
                EnumNotificationProcess.workspaceJoinRejected,
                'workspace join rejected',
            ],
        ])('returns the lowercase words of %s', (process, label) => {
            expect(util.toTemplateLabel(process)).toBe(label);
        });
    });
});
