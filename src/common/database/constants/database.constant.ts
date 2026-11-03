import type { IDatabaseModelRelations } from '@common/database/interfaces/database.extension.interface';

/**
 * Injection token of the audited, extended Prisma client.
 * @public
 */
export const DatabaseClientToken = Symbol('DatabaseClient');

/**
 * Collection and operation of a Prisma MongoDB query event, `db.<Collection>.<operation>(`.
 * @public
 */
export const DatabaseQueryTargetRegex = /^db\.(\w+)\.(\w+)\(/;

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

/**
 * Prisma error codes meaning the database cannot be reached or its connection pool is exhausted.
 * @public
 */
export const DatabaseUnavailableCodes: readonly string[] = [
    'P1001',
    'P1002',
    'P1008',
    'P1017',
    'P2024',
];

/**
 * Prisma error code of a unique-constraint violation.
 * @public
 */
export const DatabaseUniqueConstraintCode = 'P2002';

/**
 * Prisma error code of a transaction write conflict or deadlock.
 * @public
 */
export const DatabaseWriteConflictCode = 'P2034';

/**
 * Prisma error code of inconsistent column data, such as a malformed ObjectId.
 * @public
 */
export const DatabaseIdInvalidCode = 'P2023';

/**
 * Prisma error code of a transaction API failure, such as an expired or closed interactive transaction.
 * @public
 */
export const DatabaseTransactionExpiredCode = 'P2028';

/**
 * Mask written in place of a credential, and in place of a whole value that is not a url, in a logged connection url.
 * @public
 */
export const DatabaseUrlCensoredValue = '***';
