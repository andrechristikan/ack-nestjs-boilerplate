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
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { MessageService } from '@common/message/services/message.service';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

describe('NotificationUtil', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const loginAtIso = '2026-03-01T00:05:00.000Z';
    const loginAtRfc2822 = 'Sun, 01 Mar 2026 00:05:00 +0000';
    const loginAtDate = new Date(loginAtIso);
    let util: NotificationUtil;

    beforeEach(() => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        vi.mocked(configService.get).mockReturnValue('secret-key');
        helperDateService.createFromIso.mockReturnValue(loginAtDate);
        helperDateService.formatToRFC2822.mockReturnValue(loginAtRfc2822);
        util = new NotificationUtil(
            configService,
            helperEncryptionService,
            messageService,
            helperDateService
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

    describe('encryptPayload', () => {
        it('encrypts the value under the notification purpose with the given context', () => {
            helperEncryptionService.aes256Encrypt.mockReturnValue('cipher');

            const result = util.encryptPayload('plain', 'user-id');

            expect(result).toBe('cipher');
            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                'plain',
                'secret-key',
                'notification.payload',
                'user-id'
            );
        });
    });

    describe('toSealedField', () => {
        it('returns the encrypted field name', () => {
            expect(util.toSealedField('link')).toBe('encryptedLink');
        });
    });

    describe('openContext', () => {
        it('decrypts each secret of the kind back into its plain field', () => {
            helperEncryptionService.aes256Decrypt.mockReturnValue('plain-link');

            const result = util.openContext(
                EnumNotificationKind.workspaceInvite,
                {
                    reference: 'WI-ref',
                    encryptedInviteAcceptLink: 'cipher-link',
                },
                'user-id'
            );

            expect(result).toEqual({
                reference: 'WI-ref',
                inviteAcceptLink: 'plain-link',
            });
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'cipher-link',
                'secret-key',
                'notification.payload',
                'user-id'
            );
        });
    });

    describe('toMetadata', () => {
        it('returns the metadata the contract row builds for the kind', () => {
            const result = util.toMetadata(
                EnumNotificationKind.workspaceInvite,
                {
                    workspaceId: 'workspace-id',
                    workspaceName: 'Acme',
                    inviterName: 'Alice',
                    encryptedLink: 'cipher-link',
                },
                'invitee'
            );

            expect(result).toEqual({
                username: 'invitee',
                workspaceId: 'workspace-id',
                workspaceName: 'Acme',
                inviterName: 'Alice',
            });
        });

        it('keeps a date field as the ISO string the context holds', () => {
            const result = util.toMetadata(
                EnumNotificationKind.newDeviceLogin,
                { loginAt: loginAtIso, loginFrom: 'web' },
                'ana'
            );

            expect(result.loginAt).toBe(loginAtIso);
            expect(helperDateService.formatToRFC2822).not.toHaveBeenCalled();
        });
    });

    describe('toTemplateData', () => {
        it('returns the context values the contract row lists, plus the username', () => {
            const result = util.toTemplateData(
                EnumNotificationKind.workspaceJoinAccepted,
                { workspaceId: 'workspace-id', workspaceName: 'Acme' },
                'user'
            );

            expect(result).toEqual({ username: 'user', workspaceName: 'Acme' });
        });

        it('formats each date field of the kind to RFC 2822', () => {
            const result = util.toTemplateData(
                EnumNotificationKind.newDeviceLogin,
                { loginFrom: 'web', loginAt: loginAtIso },
                'ana'
            );

            expect(result.loginAt).toBe(loginAtRfc2822);
            expect(result.loginFrom).toBe('web');
            expect(helperDateService.createFromIso).toHaveBeenCalledWith(
                loginAtIso
            );
            expect(helperDateService.formatToRFC2822).toHaveBeenCalledWith(
                loginAtDate
            );
        });
    });

    describe('toDisplayProperties', () => {
        it('formats the date fields of the kind and keeps every other value', () => {
            const result = util.toDisplayProperties(
                EnumNotificationKind.newDeviceLogin,
                { username: 'ana', loginAt: loginAtIso, loginFrom: 'web' }
            );

            expect(result).toEqual({
                username: 'ana',
                loginAt: loginAtRfc2822,
                loginFrom: 'web',
            });
        });

        it('skips a date field the properties do not hold', () => {
            const result = util.toDisplayProperties(
                EnumNotificationKind.workspaceInvite,
                { username: 'ana', workspaceName: 'Acme' }
            );

            expect(result).toEqual({ username: 'ana', workspaceName: 'Acme' });
            expect(helperDateService.createFromIso).not.toHaveBeenCalled();
        });

        it('returns the properties as they are for a kind with no date field', () => {
            const properties = { username: 'ana', version: 3 };

            const result = util.toDisplayProperties(
                EnumNotificationKind.publishTermPolicy,
                properties
            );

            expect(result).toEqual(properties);
            expect(helperDateService.formatToRFC2822).not.toHaveBeenCalled();
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

    describe('toTemplateLabel', () => {
        it.each([
            [EnumNotificationKind.welcome, 'welcome'],
            [EnumNotificationKind.welcomeSocial, 'welcome social'],
            [EnumNotificationKind.welcomeByAdmin, 'welcome by admin'],
            [EnumNotificationKind.verificationEmail, 'verification email'],
            [EnumNotificationKind.verifiedEmail, 'verified email'],
            [
                EnumNotificationKind.verifiedMobileNumber,
                'verified mobile number',
            ],
            [EnumNotificationKind.changePassword, 'change password'],
            [
                EnumNotificationKind.temporaryPasswordByAdmin,
                'temporary password by admin',
            ],
            [EnumNotificationKind.resetPassword, 'reset password'],
            [EnumNotificationKind.forgotPassword, 'forgot password'],
            [
                EnumNotificationKind.resetTwoFactorByAdmin,
                'reset two factor by admin',
            ],
            [EnumNotificationKind.newDeviceLogin, 'new device login'],
            [EnumNotificationKind.publishTermPolicy, 'publish term policy'],
            [EnumNotificationKind.workspaceInvite, 'workspace invite'],
            [
                EnumNotificationKind.workspaceJoinRequest,
                'workspace join request',
            ],
            [
                EnumNotificationKind.workspaceJoinAccepted,
                'workspace join accepted',
            ],
            [
                EnumNotificationKind.workspaceJoinRejected,
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

        it.each([
            EnumNotificationKind.temporaryPasswordByAdmin,
            EnumNotificationKind.resetPassword,
            EnumNotificationKind.resetTwoFactorByAdmin,
        ])('lists %s as mandatory so no setting reaches it', kind => {
            expect(NotificationKindContract[kind].isMandatory).toBe(true);
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
