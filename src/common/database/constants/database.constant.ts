import type { IDatabaseModelRelations } from '@common/database/interfaces/database.extension.interface';

/**
 * Injection token of the audited, extended Prisma client.
 * @public
 */
export const DatabaseClientToken = Symbol('DatabaseClient');

/**
 * Relation field to related model map per Prisma model, used to stamp audit fields on nested writes.
 * @public
 */
export const DatabaseModelRelations = {
    ApiKey: {},
    Role: { policies: 'Policy', users: 'User' },
    Policy: { role: 'Role' },
    Country: { mobileNumbers: 'UserMobileNumber', users: 'User' },
    UserMobileNumber: {
        country: 'Country',
        user: 'User',
        verifications: 'Verification',
    },
    User: {
        mobileNumbers: 'UserMobileNumber',
        verifications: 'Verification',
        passwordHistories: 'PasswordHistory',
        activityLogs: 'ActivityLog',
        role: 'Role',
        country: 'Country',
        sessions: 'Session',
        acceptances: 'TermPolicyUserAcceptance',
        forgotPasswords: 'ForgotPassword',
        twoFactor: 'TwoFactor',
        notifications: 'Notification',
        notificationSettings: 'NotificationUserSetting',
        deviceOwnerships: 'DeviceOwnership',
        revokedSessions: 'Session',
        revokedDeviceOwnerships: 'DeviceOwnership',
        workspaceMembers: 'WorkspaceMember',
        workspaceJoinRequests: 'WorkspaceJoinRequest',
        projectMembers: 'ProjectMember',
    },
    Verification: { user: 'User', mobileNumber: 'UserMobileNumber' },
    PasswordHistory: { user: 'User' },
    ActivityLog: { user: 'User', workspace: 'Workspace' },
    Session: {
        revokedBy: 'User',
        user: 'User',
        deviceOwnership: 'DeviceOwnership',
    },
    Device: { ownerships: 'DeviceOwnership' },
    DeviceOwnership: {
        revokedBy: 'User',
        device: 'Device',
        user: 'User',
        sessions: 'Session',
    },
    TwoFactor: { user: 'User' },
    TermPolicy: { userAcceptances: 'TermPolicyUserAcceptance' },
    TermPolicyUserAcceptance: { user: 'User', termPolicy: 'TermPolicy' },
    FeatureFlag: {},
    ForgotPassword: { user: 'User' },
    Notification: { user: 'User', deliveries: 'NotificationDelivery' },
    NotificationDelivery: { notification: 'Notification' },
    NotificationUserSetting: { user: 'User' },
    Workspace: {
        members: 'WorkspaceMember',
        invites: 'WorkspaceInvite',
        joinRequests: 'WorkspaceJoinRequest',
        projects: 'Project',
        activityLogs: 'ActivityLog',
    },
    WorkspaceMember: { workspace: 'Workspace', user: 'User' },
    WorkspaceInvite: { workspace: 'Workspace', project: 'Project' },
    WorkspaceJoinRequest: { workspace: 'Workspace', user: 'User' },
    Project: {
        workspace: 'Workspace',
        members: 'ProjectMember',
        invites: 'WorkspaceInvite',
    },
    ProjectMember: { project: 'Project', user: 'User' },
} as const satisfies IDatabaseModelRelations;
