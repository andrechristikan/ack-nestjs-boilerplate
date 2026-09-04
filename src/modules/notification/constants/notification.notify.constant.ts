import {
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
} from '@generated/prisma-client';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { INotificationKindRule } from '@modules/notification/interfaces/notification.interface';

export const UserNotificationKindRules: Record<
    EnumNotificationKind,
    INotificationKindRule
> = {
    [EnumNotificationKind.welcome]: {
        type: EnumNotificationType.userActivity,
        priority: EnumNotificationPriority.normal,
        title: 'notification.notify.welcome.title',
        body: 'notification.notify.welcome.body',
        pendingChannels: [EnumNotificationChannel.email],
        deliveredChannels: [
            EnumNotificationChannel.silent,
            EnumNotificationChannel.inApp,
        ],
    },
    [EnumNotificationKind.welcomeSocial]: {
        type: EnumNotificationType.userActivity,
        priority: EnumNotificationPriority.normal,
        title: 'notification.notify.welcomeSocial.title',
        body: 'notification.notify.welcomeSocial.body',
        pendingChannels: [EnumNotificationChannel.email],
        deliveredChannels: [
            EnumNotificationChannel.silent,
            EnumNotificationChannel.inApp,
        ],
    },
    [EnumNotificationKind.welcomeByAdmin]: {
        type: EnumNotificationType.userActivity,
        priority: EnumNotificationPriority.normal,
        title: 'notification.notify.welcomeByAdmin.title',
        body: 'notification.notify.welcomeByAdmin.body',
        pendingChannels: [EnumNotificationChannel.email],
        deliveredChannels: [
            EnumNotificationChannel.silent,
            EnumNotificationChannel.inApp,
        ],
    },
    [EnumNotificationKind.verificationEmail]: {
        type: EnumNotificationType.userActivity,
        priority: EnumNotificationPriority.high,
        title: 'notification.notify.verificationEmail.title',
        body: 'notification.notify.verificationEmail.body',
        pendingChannels: [EnumNotificationChannel.email],
        deliveredChannels: [EnumNotificationChannel.silent],
    },
    [EnumNotificationKind.verifiedEmail]: {
        type: EnumNotificationType.userActivity,
        priority: EnumNotificationPriority.normal,
        title: 'notification.notify.verifiedEmail.title',
        body: 'notification.notify.verifiedEmail.body',
        pendingChannels: [EnumNotificationChannel.email],
        deliveredChannels: [EnumNotificationChannel.silent],
    },
    [EnumNotificationKind.mobileNumberVerified]: {
        type: EnumNotificationType.userActivity,
        priority: EnumNotificationPriority.normal,
        title: 'notification.notify.mobileNumberVerified.title',
        body: 'notification.notify.mobileNumberVerified.body',
        pendingChannels: [EnumNotificationChannel.email],
        deliveredChannels: [EnumNotificationChannel.silent],
    },
    [EnumNotificationKind.temporaryPasswordByAdmin]: {
        type: EnumNotificationType.securityAlert,
        priority: EnumNotificationPriority.critical,
        title: 'notification.notify.temporaryPasswordByAdmin.title',
        body: 'notification.notify.temporaryPasswordByAdmin.body',
        pendingChannels: [
            EnumNotificationChannel.email,
            EnumNotificationChannel.push,
        ],
        deliveredChannels: [EnumNotificationChannel.silent],
    },
    [EnumNotificationKind.changePassword]: {
        type: EnumNotificationType.securityAlert,
        priority: EnumNotificationPriority.critical,
        title: 'notification.notify.changePassword.title',
        body: 'notification.notify.changePassword.body',
        pendingChannels: [EnumNotificationChannel.email],
        deliveredChannels: [EnumNotificationChannel.silent],
    },
    [EnumNotificationKind.forgotPassword]: {
        type: EnumNotificationType.securityAlert,
        priority: EnumNotificationPriority.critical,
        title: 'notification.notify.forgotPassword.title',
        body: 'notification.notify.forgotPassword.body',
        pendingChannels: [
            EnumNotificationChannel.email,
            EnumNotificationChannel.push,
        ],
        deliveredChannels: [EnumNotificationChannel.silent],
    },
    [EnumNotificationKind.resetPassword]: {
        type: EnumNotificationType.securityAlert,
        priority: EnumNotificationPriority.critical,
        title: 'notification.notify.resetPassword.title',
        body: 'notification.notify.resetPassword.body',
        pendingChannels: [
            EnumNotificationChannel.email,
            EnumNotificationChannel.push,
        ],
        deliveredChannels: [EnumNotificationChannel.silent],
    },
    [EnumNotificationKind.resetTwoFactorByAdmin]: {
        type: EnumNotificationType.securityAlert,
        priority: EnumNotificationPriority.critical,
        title: 'notification.notify.resetTwoFactorByAdmin.title',
        body: 'notification.notify.resetTwoFactorByAdmin.body',
        pendingChannels: [
            EnumNotificationChannel.email,
            EnumNotificationChannel.push,
        ],
        deliveredChannels: [EnumNotificationChannel.silent],
    },
    [EnumNotificationKind.newDeviceLogin]: {
        type: EnumNotificationType.securityAlert,
        priority: EnumNotificationPriority.critical,
        title: 'notification.notify.newDeviceLogin.title',
        body: 'notification.notify.newDeviceLogin.body',
        pendingChannels: [
            EnumNotificationChannel.email,
            EnumNotificationChannel.push,
        ],
        deliveredChannels: [EnumNotificationChannel.silent],
    },
    [EnumNotificationKind.publishTermPolicy]: {
        type: EnumNotificationType.transactional,
        priority: EnumNotificationPriority.normal,
        title: 'notification.notify.publishTermPolicy.title',
        body: 'notification.notify.publishTermPolicy.body',
        pendingChannels: [EnumNotificationChannel.email],
        deliveredChannels: [EnumNotificationChannel.silent],
    },
    [EnumNotificationKind.userAcceptTermPolicy]: {
        type: EnumNotificationType.transactional,
        priority: EnumNotificationPriority.normal,
        title: 'notification.notify.userAcceptTermPolicy.title',
        body: 'notification.notify.userAcceptTermPolicy.body',
        pendingChannels: [EnumNotificationChannel.push],
        deliveredChannels: [EnumNotificationChannel.silent],
    },
    [EnumNotificationKind.workspaceInvite]: {
        type: EnumNotificationType.userActivity,
        priority: EnumNotificationPriority.normal,
        title: 'notification.notify.workspaceInvite.title',
        body: 'notification.notify.workspaceInvite.body',
        pendingChannels: [
            EnumNotificationChannel.email,
            EnumNotificationChannel.push,
        ],
        deliveredChannels: [
            EnumNotificationChannel.silent,
            EnumNotificationChannel.inApp,
        ],
    },
    [EnumNotificationKind.workspaceJoinRequest]: {
        type: EnumNotificationType.userActivity,
        priority: EnumNotificationPriority.normal,
        title: 'notification.notify.workspaceJoinRequest.title',
        body: 'notification.notify.workspaceJoinRequest.body',
        pendingChannels: [
            EnumNotificationChannel.email,
            EnumNotificationChannel.push,
        ],
        deliveredChannels: [
            EnumNotificationChannel.silent,
            EnumNotificationChannel.inApp,
        ],
    },
    [EnumNotificationKind.workspaceJoinAccepted]: {
        type: EnumNotificationType.userActivity,
        priority: EnumNotificationPriority.normal,
        title: 'notification.notify.workspaceJoinAccepted.title',
        body: 'notification.notify.workspaceJoinAccepted.body',
        pendingChannels: [
            EnumNotificationChannel.email,
            EnumNotificationChannel.push,
        ],
        deliveredChannels: [
            EnumNotificationChannel.silent,
            EnumNotificationChannel.inApp,
        ],
    },
    [EnumNotificationKind.workspaceJoinRejected]: {
        type: EnumNotificationType.userActivity,
        priority: EnumNotificationPriority.normal,
        title: 'notification.notify.workspaceJoinRejected.title',
        body: 'notification.notify.workspaceJoinRejected.body',
        pendingChannels: [
            EnumNotificationChannel.email,
            EnumNotificationChannel.push,
        ],
        deliveredChannels: [
            EnumNotificationChannel.silent,
            EnumNotificationChannel.inApp,
        ],
    },
};
