import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
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
                channels: util['resolveChannels'](
                    EnumNotificationKind.welcome,
                    []
                ),
            });
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
                util['resolveChannels'](
                    EnumNotificationKind.workspaceInvite,
                    []
                )
            ).toEqual([
                ...NotificationKindContract.workspaceInvite.pendingChannels,
                ...NotificationKindContract.workspaceInvite.deliveredChannels,
            ]);
        });

        it('drops a channel the user disabled for a configurable type', () => {
            const channels = util['resolveChannels'](
                EnumNotificationKind.workspaceInvite,
                [userActivityEmailOff]
            );
            expect(channels).not.toContain(EnumNotificationChannel.email);
        });

        it('drops inApp when disabled and keeps silent', () => {
            const channels = util['resolveChannels'](
                EnumNotificationKind.welcome,
                [userActivityInAppOff]
            );
            expect(channels).not.toContain(EnumNotificationChannel.inApp);
            expect(channels).toContain(EnumNotificationChannel.silent);
        });

        it('returns no channel when only silent survives the disabled settings', () => {
            expect(
                util['resolveChannels'](EnumNotificationKind.welcome, [
                    userActivityEmailOff,
                    userActivityInAppOff,
                ])
            ).toEqual([]);
        });

        it('ignores settings for a mandatory kind', () => {
            expect(
                util['resolveChannels'](
                    EnumNotificationKind.verificationEmail,
                    [userActivityEmailOff]
                )
            ).toContain(EnumNotificationChannel.email);
        });

        it('ignores settings for a non-configurable type', () => {
            expect(
                util['resolveChannels'](EnumNotificationKind.newDeviceLogin, [
                    securityAlertEmailOff,
                ])
            ).toContain(EnumNotificationChannel.email);
        });

        it('ignores a disabled row of another type', () => {
            expect(
                util['resolveChannels'](EnumNotificationKind.workspaceInvite, [
                    marketingEmailOff,
                ])
            ).toContain(EnumNotificationChannel.email);
        });
    });
});
