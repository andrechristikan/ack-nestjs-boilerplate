import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import {
    EnumNotificationKind,
    EnumNotificationSmsProcess,
} from '@modules/notification/enums/notification.enum';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
} from '@generated/prisma-client/client';

const notification = JSON.parse(
    readFileSync(
        resolve(process.cwd(), 'src/languages/en/notification.json'),
        'utf8'
    )
) as {
    notify: Record<string, { title: string; body: string }>;
    sms: Record<string, string>;
};

describe('NotificationKindContract channel declarations', () => {
    it('preserves the original pending channel lists for every kind', () => {
        const channels = Object.fromEntries(
            Object.entries(NotificationKindContract).map(([kind, contract]) => [
                kind,
                contract.pendingChannels,
            ])
        );
        expect(channels).toEqual({
            welcome: ['email'],
            welcomeSocial: ['email'],
            welcomeByAdmin: ['email'],
            verificationEmail: ['email'],
            verifiedEmail: ['email'],
            verificationMobileNumber: ['sms'],
            temporaryPasswordByAdmin: ['email', 'push'],
            changePassword: ['email'],
            forgotPassword: ['email', 'push'],
            resetPassword: ['email', 'push'],
            resetTwoFactorByAdmin: ['email', 'push', 'sms'],
            newDeviceLogin: ['email', 'push', 'sms'],
            publishTermPolicy: ['email'],
            userAcceptTermPolicy: ['push'],
            workspaceInvite: ['email', 'push'],
            workspaceJoinRequest: ['email', 'push'],
            workspaceJoinAccepted: ['email', 'push'],
            workspaceJoinRejected: ['email', 'push'],
        });
    });

    it('declares the verificationMobileNumber row with resolvable en keys', () => {
        const row =
            NotificationKindContract[
                EnumNotificationKind.verificationMobileNumber
            ];
        expect(row.pendingChannels).toEqual([EnumNotificationChannel.sms]);
        expect(row.deliveredChannels).toEqual([EnumNotificationChannel.silent]);
        expect(row.priority).toBe(EnumNotificationPriority.high);
        expect(row.type).toBe(EnumNotificationType.userActivity);
        expect(row.title).toBe(
            'notification.notify.verificationMobileNumber.title'
        );
        expect(row.body).toBe(
            'notification.notify.verificationMobileNumber.body'
        );
        expect(
            notification.notify.verificationMobileNumber.title
        ).toBeDefined();
        expect(notification.notify.verificationMobileNumber.body).toBeDefined();
        expect(notification.sms.verificationMobileNumber).toBeDefined();
        expect(Object.values(EnumNotificationSmsProcess)).toContain(
            EnumNotificationSmsProcess.verificationMobileNumber
        );
    });
});
