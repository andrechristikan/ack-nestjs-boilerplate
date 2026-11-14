import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';

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
            verifiedMobileNumber: ['email'],
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
});
