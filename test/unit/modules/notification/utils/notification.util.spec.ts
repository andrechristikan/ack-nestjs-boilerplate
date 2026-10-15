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

describe('NotificationUtil', () => {
    const util = new NotificationUtil();

    describe('toStepFailure', () => {
        it('maps an Error reason to its message', () => {
            expect(
                util.toStepFailure(
                    EnumNotificationStep.sendEmail,
                    new Error('down')
                )
            ).toEqual({ step: EnumNotificationStep.sendEmail, error: 'down' });
        });

        it('maps a non-Error reason to its string form', () => {
            expect(
                util.toStepFailure(EnumNotificationStep.sendPush, 'boom')
            ).toEqual({ step: EnumNotificationStep.sendPush, error: 'boom' });
        });
    });

    describe('toStepSummary', () => {
        it('summarizes failed steps as step:error pairs on one line', () => {
            expect(
                util.toStepSummary([
                    { step: EnumNotificationStep.sendEmail, error: 'down' },
                    { step: EnumNotificationStep.sendPush, error: 'boom' },
                ])
            ).toBe('Notification steps failed: sendEmail:down, sendPush:boom');
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
});
