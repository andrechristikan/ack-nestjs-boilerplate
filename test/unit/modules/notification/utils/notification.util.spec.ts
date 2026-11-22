import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { ConfigService } from '@nestjs/config';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
import {
    buildSealedNotificationPayload,
    buildUnsealedNotificationPayloads,
} from '@test/unit/helpers/test.unit.notification-push.helper';

describe('NotificationUtil', () => {
    const loginAtIso = '2026-03-01T00:05:00.000Z';
    const loginAtRfc2822 = 'Sun, 01 Mar 2026 00:05:00 +0000';
    let util: NotificationUtil;

    beforeEach(() => {
        util = new NotificationUtil(
            buildConfigService({
                ...TestUnitKitConfigValues,
                'notification.idempotencyKey.stepPattern':
                    '{notificationId}-{step}',
            }) as ConfigService,
            new HelperEncryptionService(),
            new HelperDateService(
                buildConfigService(TestUnitKitConfigValues) as ConfigService
            ),
            new HelperStringService()
        );
    });

    describe('decryptPayload', () => {
        it('decrypts a payload sealed for the context with the notification purpose', () => {
            const sealed = buildSealedNotificationPayload('plain', 'user-id');

            expect(util.decryptPayload(sealed, 'user-id')).toBe('plain');
        });

        it('throws when the context differs from the sealed one', () => {
            const sealed = buildSealedNotificationPayload('plain', 'user-id');

            expect(() => util.decryptPayload(sealed, 'other-id')).toThrow();
        });
    });

    describe('encryptPayload', () => {
        it('round-trips through decryptPayload under its context', () => {
            const sealed = util.encryptPayload('plain', 'user-id');

            expect(sealed).not.toBe('plain');
            expect(util.decryptPayload(sealed, 'user-id')).toBe('plain');
        });
    });

    describe('sealSnapshot', () => {
        const user = {
            id: 'user-id',
            email: 'user@example.com',
            username: 'user',
        };

        it('encrypts the email and each distinct token against the user id', () => {
            const result = util.sealSnapshot(user, ['a', 'a', 'b']);

            expect(result.username).toBe('user');
            expect(util.decryptPayload(result.encryptedEmail, 'user-id')).toBe(
                'user@example.com'
            );
            expect(
                buildUnsealedNotificationPayloads(
                    result.encryptedTokens,
                    'user-id'
                )
            ).toEqual(['a', 'b']);
        });

        it('yields no encrypted tokens for an empty token list', () => {
            const result = util.sealSnapshot(user, []);

            expect(result.encryptedTokens).toEqual([]);
        });
    });

    describe('sealContext', () => {
        it('renames and encrypts only the secret fields', () => {
            const result = util.sealContext(
                { userId: 'user-id', proceedBy: 'actor-id', otp: '482913' },
                ['otp'],
                'user-id'
            );

            expect(result).toEqual({
                userId: 'user-id',
                proceedBy: 'actor-id',
                encryptedOtp: expect.any(String),
            });
            expect(
                util.decryptPayload(String(result.encryptedOtp), 'user-id')
            ).toBe('482913');
        });
    });

    describe('toStepKey', () => {
        it('fills the step pattern', () => {
            expect(
                util.toStepKey(
                    'notification-id',
                    EnumNotificationStep.sendEmail
                )
            ).toBe('notification-id-sendEmail');
        });
    });

    describe('toSealedField', () => {
        it('returns the encrypted field name', () => {
            expect(util.toSealedField('link')).toBe('encryptedLink');
        });
    });

    describe('openContext', () => {
        it('decrypts each secret of the kind back into its plain field', () => {
            const result = util.openContext(
                EnumNotificationKind.workspaceInvite,
                {
                    reference: 'WI-ref',
                    encryptedInviteAcceptLink: buildSealedNotificationPayload(
                        'plain-link',
                        'user-id'
                    ),
                },
                'user-id'
            );

            expect(result).toEqual({
                reference: 'WI-ref',
                inviteAcceptLink: 'plain-link',
            });
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
        });

        it('returns the properties as they are for a kind with no date field', () => {
            const properties = { username: 'ana', version: 3 };

            const result = util.toDisplayProperties(
                EnumNotificationKind.publishTermPolicy,
                properties
            );

            expect(result).toEqual(properties);
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
            EnumNotificationKind.resetMfaByAdmin,
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
