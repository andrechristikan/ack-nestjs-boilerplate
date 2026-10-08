import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
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
});
