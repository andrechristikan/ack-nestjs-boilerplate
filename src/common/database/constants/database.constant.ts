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
    UserPhoto: { user: 'User' },
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
        photo: 'UserPhoto',
        featureFlagUsers: 'FeatureFlagUser',
        reviewedWorkspaceRequests: 'WorkspaceJoinRequest',
        sentWorkspaceInvites: 'WorkspaceInvite',
        acceptedWorkspaceInvites: 'WorkspaceInvite',
        lastWorkspace: 'Workspace',
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
    TwoFactor: { user: 'User', backupCodes: 'TwoFactorBackupCode' },
    TwoFactorBackupCode: { twoFactor: 'TwoFactor' },
    TermPolicy: {
        contents: 'TermPolicyContent',
        userAcceptances: 'TermPolicyUserAcceptance',
    },
    TermPolicyContent: { termPolicy: 'TermPolicy' },
    TermPolicyUserAcceptance: { user: 'User', termPolicy: 'TermPolicy' },
    FeatureFlag: { targetUsers: 'FeatureFlagUser' },
    FeatureFlagUser: { featureFlag: 'FeatureFlag', user: 'User' },
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
        lastUsers: 'User',
    },
    WorkspaceMember: { workspace: 'Workspace', user: 'User' },
    WorkspaceInvite: {
        workspace: 'Workspace',
        project: 'Project',
        invitedBy: 'User',
        acceptedBy: 'User',
    },
    WorkspaceJoinRequest: {
        workspace: 'Workspace',
        user: 'User',
        reviewedBy: 'User',
    },
    Project: {
        workspace: 'Workspace',
        members: 'ProjectMember',
        invites: 'WorkspaceInvite',
    },
    ProjectMember: { project: 'Project', user: 'User' },
} as const satisfies IDatabaseModelRelations;
