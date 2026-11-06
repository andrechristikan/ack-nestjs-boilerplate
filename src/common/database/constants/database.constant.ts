import type { IDatabaseModelRelations } from '@common/database/interfaces/database.extension.interface';

/** @public */
export const DatabaseClientToken = Symbol('DatabaseClient');

/** @public */
export const DatabaseQueryTargetRegex = /^db\.(\w+)\.(\w+)\(/;

/** @public */
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
        termPolicyRecipients: 'TermPolicyRecipient',
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
    TermPolicyRecipient: { user: 'User' },
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

/** @public */
export const DatabaseUnavailableCodes: readonly string[] = [
    'P1001',
    'P1002',
    'P1008',
    'P1017',
    'P2024',
];

/** @public */
export const DatabaseUniqueConstraintCode = 'P2002';

/** @public */
export const DatabaseWriteConflictCode = 'P2034';

/** @public */
export const DatabaseIdInvalidCode = 'P2023';

/** @public */
export const DatabaseTransactionExpiredCode = 'P2028';

/** @public */
export const DatabaseUrlCensoredValue = '***';
