import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

describe('NotificationUtil', () => {
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
        vi.mocked(configService.get).mockReturnValue('secret-key');
        helperDateService.createFromIso.mockReturnValue(loginAtDate);
        helperDateService.formatToRFC2822.mockReturnValue(loginAtRfc2822);
        util = new NotificationUtil(
            configService,
            helperEncryptionService,
            helperDateService
        );
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
