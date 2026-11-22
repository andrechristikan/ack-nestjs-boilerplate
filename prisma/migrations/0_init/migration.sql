-- CreateEnum
CREATE TYPE "EnumAwsS3Accessibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "EnumUserGender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "EnumUserStatus" AS ENUM ('active', 'inactive', 'blocked');

-- CreateEnum
CREATE TYPE "EnumUserSignUpFrom" AS ENUM ('system', 'admin', 'website', 'mobile');

-- CreateEnum
CREATE TYPE "EnumUserSignUpWith" AS ENUM ('credential', 'socialGoogle', 'socialApple');

-- CreateEnum
CREATE TYPE "EnumUserLoginFrom" AS ENUM ('website', 'mobile');

-- CreateEnum
CREATE TYPE "EnumUserLoginWith" AS ENUM ('credential', 'socialGoogle', 'socialApple', 'passkey');

-- CreateEnum
CREATE TYPE "EnumRoleType" AS ENUM ('superAdmin', 'admin', 'user');

-- CreateEnum
CREATE TYPE "EnumPolicyAction" AS ENUM ('manage', 'read', 'create', 'update', 'delete');

-- CreateEnum
CREATE TYPE "EnumPolicySubject" AS ENUM ('all', 'apiKey', 'role', 'user', 'session', 'activityLog', 'passwordHistory', 'termPolicy', 'featureFlag', 'device', 'workspace', 'project', 'analytic');

-- CreateEnum
CREATE TYPE "EnumApiKeyType" AS ENUM ('system', 'default');

-- CreateEnum
CREATE TYPE "EnumTermPolicyType" AS ENUM ('termsOfService', 'privacy', 'cookies', 'marketing');

-- CreateEnum
CREATE TYPE "EnumTermPolicyStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "EnumVerificationType" AS ENUM ('mobileNumber', 'email', 'reauthentication');

-- CreateEnum
CREATE TYPE "EnumUserReauthenticationAction" AS ENUM ('deleteSelf', 'changePassword', 'mfaTotpSetup', 'mfaTotpEnable', 'mfaTotpDisable', 'mfaBackupCodeRegenerate', 'mfaPasskeyRegister', 'mfaPasskeyDelete', 'mobileNumberAdd', 'mobileNumberUpdate', 'mobileNumberDelete', 'sessionRevoke', 'deviceRemove');

-- CreateEnum
CREATE TYPE "EnumPasswordHistoryType" AS ENUM ('signUp', 'forgot', 'admin', 'profile');

-- CreateEnum
CREATE TYPE "EnumActivityLogAction" AS ENUM ('userCreated', 'userBlocked', 'userUpdateStatus', 'userUpdateProfile', 'userUpdateNotificationSetting', 'userUpdatePhotoProfile', 'userChangePassword', 'userDeleteSelf', 'userAddMobileNumber', 'userUpdateMobileNumber', 'userDeleteMobileNumber', 'userClaimUsername', 'userUpdatePasswordByAdmin', 'userLoginCredential', 'userLoginFailed', 'userLoginGoogle', 'userLoginApple', 'userLoginPasskey', 'userRefreshToken', 'userVerifiedEmail', 'userSendVerificationEmail', 'userVerifiedMobileNumber', 'userSendVerificationMobileNumber', 'userSendReauthenticationOtp', 'userSignedUp', 'userResetPassword', 'userRevokeSession', 'userRevokeSessionByAdmin', 'userRevokeAllSessions', 'userRevokeAllSessionsByAdmin', 'userRevokeSessionByDeviceLogin', 'userRemoveDevice', 'userAcceptTermPolicy', 'userForgotPassword', 'userReachMaxPasswordAttempt', 'userReachMaxMfaAttempt', 'userSetupMfaTotp', 'userEnableMfaTotp', 'userDisableMfaTotp', 'userResetMfaByAdmin', 'userVerifyMfa', 'userVerifyMfaFailed', 'userRegenerateMfaBackupCodes', 'userRegisterMfaPasskey', 'userUpdateMfaPasskey', 'userDeleteMfaPasskey', 'userDeviceRefresh', 'userLogout', 'userCreatedByAdmin', 'userRemoveDeviceByAdmin', 'adminSessionRevoke', 'adminApiKeyCreate', 'adminApiKeyReset', 'adminApiKeyUpdate', 'adminApiKeyUpdateDate', 'adminApiKeyUpdateStatus', 'adminApiKeyDelete', 'adminRoleCreate', 'adminRoleUpdate', 'adminRoleDelete', 'adminPolicyCreate', 'adminPolicyUpdate', 'adminPolicyDelete', 'adminTermPolicyCreate', 'adminTermPolicyDelete', 'adminTermPolicyUpdateContent', 'adminTermPolicyAddContent', 'adminTermPolicyRemoveContent', 'adminTermPolicyPublish', 'adminTermPolicyResendEmail', 'adminUserCreate', 'adminUserUpdateStatus', 'adminUserUpdatePassword', 'adminUserResetMfa', 'adminUserImport', 'adminDeviceRemove', 'adminSessionRevokeAll', 'adminWorkspaceOwnershipTransfer', 'workspaceCreated', 'workspaceUpdated', 'workspaceVisibilityUpdated', 'workspaceDeleted', 'workspaceSwitched', 'workspaceMemberRoleUpdated', 'workspaceMemberRemoved', 'workspaceMemberLeft', 'workspaceOwnershipTransferred', 'workspaceInviteCreated', 'workspaceInviteResent', 'workspaceInviteAccepted', 'workspaceInviteRevoked', 'workspaceJoinRequested', 'workspaceJoinAccepted', 'workspaceJoinRejected', 'workspaceCreatedByAdmin', 'workspaceMemberRoleUpdatedByAdmin', 'workspaceMemberRemovedByAdmin', 'workspaceOwnershipTransferredByOwner', 'workspaceOwnershipTransferredByAdmin', 'workspaceOwnershipRemovedByAdmin', 'workspaceInviteCreatedByAdmin', 'workspaceInviteResentByAdmin', 'workspaceInviteAcceptedByInvitee', 'workspaceInviteRevokedByAdmin', 'workspaceJoinAcceptedByAdmin', 'workspaceJoinRejectedByAdmin', 'projectCreated', 'projectUpdated', 'projectDeleted', 'projectMemberAssigned', 'projectMemberRoleUpdated', 'projectMemberRemoved', 'projectMemberLeft', 'projectMemberAssignedByAdmin', 'projectMemberRoleUpdatedByAdmin', 'projectMemberRemovedByAdmin');

-- CreateEnum
CREATE TYPE "EnumDevicePlatform" AS ENUM ('ios', 'android', 'web');

-- CreateEnum
CREATE TYPE "EnumDeviceNotificationProvider" AS ENUM ('fcm', 'apns');

-- CreateEnum
CREATE TYPE "EnumNotificationType" AS ENUM ('securityAlert', 'transactional', 'userActivity', 'marketing');

-- CreateEnum
CREATE TYPE "EnumNotificationChannel" AS ENUM ('push', 'email', 'sms', 'inApp', 'silent');

-- CreateEnum
CREATE TYPE "EnumNotificationPriority" AS ENUM ('low', 'normal', 'high', 'critical');

-- CreateEnum
CREATE TYPE "EnumMfaPasskeyDeviceType" AS ENUM ('singleDevice', 'multiDevice');

-- CreateEnum
CREATE TYPE "EnumMfaChallengePurpose" AS ENUM ('login', 'passwordless', 'registration', 'reauthentication', 'resetPassword');

-- CreateEnum
CREATE TYPE "EnumWorkspaceMemberRole" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "EnumWorkspaceInviteStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "EnumWorkspaceJoinRequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "EnumWorkspaceJoinRejectReason" AS ENUM ('notAFit', 'incompleteProfile', 'spam', 'unknownRequester', 'wrongWorkspace', 'memberLimitReached', 'other');

-- CreateEnum
CREATE TYPE "EnumProjectMemberRole" AS ENUM ('admin', 'member', 'viewer');

-- CreateEnum
CREATE TYPE "EnumOutboxStatus" AS ENUM ('pending', 'enqueued', 'completed', 'failed');

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "type" "EnumApiKeyType" NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "EnumRoleType" NOT NULL DEFAULT 'user',
    "isImmutable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "roleId" UUID NOT NULL,
    "subject" "EnumPolicySubject" NOT NULL,
    "action" "EnumPolicyAction"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT NOT NULL,
    "alpha2Code" TEXT NOT NULL,
    "alpha3Code" TEXT NOT NULL,
    "continent" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "phoneCode" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mobile_numbers" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "countryId" UUID NOT NULL,
    "phoneCode" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "user_mobile_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_socials" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "provider" "EnumUserLoginWith" NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "user_socials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT,
    "username" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "email" TEXT NOT NULL,
    "roleId" UUID NOT NULL,
    "password" TEXT,
    "passwordExpired" TIMESTAMP(3),
    "passwordCreated" TIMESTAMP(3),
    "passwordAttempt" INTEGER NOT NULL DEFAULT 0,
    "passwordLockedUntil" TIMESTAMP(3),
    "signUpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signUpFrom" "EnumUserSignUpFrom" NOT NULL,
    "signUpWith" "EnumUserSignUpWith" NOT NULL,
    "status" "EnumUserStatus" NOT NULL DEFAULT 'active',
    "gender" "EnumUserGender",
    "countryId" UUID NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "lastIPAddress" INET,
    "lastLoginFrom" "EnumUserLoginFrom",
    "lastLoginWith" "EnumUserLoginWith",
    "lastWorkspaceId" UUID,
    "lastWorkspaceChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "mobileNumberId" UUID,
    "to" TEXT NOT NULL,
    "type" "EnumVerificationType" NOT NULL,
    "action" "EnumUserReauthenticationAction",
    "token" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_histories" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "password" TEXT NOT NULL,
    "type" "EnumPasswordHistoryType" NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "password_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_passwords" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "common_passwords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_social_nonces" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "nonceHash" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "auth_social_nonces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "workspaceId" UUID,
    "action" "EnumActivityLogAction" NOT NULL,
    "ipAddress" INET,
    "userAgent" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "geoLocation" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_photos" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "cdnUrl" TEXT,
    "completedUrl" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "access" "EnumAwsS3Accessibility" NOT NULL,

    CONSTRAINT "user_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "deviceOwnershipId" UUID NOT NULL,
    "jtiDigest" TEXT NOT NULL,
    "ipAddress" INET,
    "userAgent" JSONB NOT NULL,
    "geoLocation" JSONB,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "fingerprint" TEXT NOT NULL,
    "name" TEXT,
    "platform" "EnumDevicePlatform" NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_ownerships" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "deviceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedById" UUID,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificationToken" TEXT,
    "notificationProvider" "EnumDeviceNotificationProvider",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "device_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfas" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "mfas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_backup_codes" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "mfaId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_totps" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "secret" TEXT,
    "pendingSecret" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedStep" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "mfa_totps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_passkeys" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deviceType" "EnumMfaPasskeyDeviceType" NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "name" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "mfa_passkeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_challenges" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID,
    "purpose" "EnumMfaChallengePurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "webAuthnChallenge" TEXT,
    "device" JSONB,
    "loginFrom" "EnumUserLoginFrom",
    "loginWith" "EnumUserLoginWith",
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_policies" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "type" "EnumTermPolicyType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "EnumTermPolicyStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "term_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_policy_contents" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "termPolicyId" UUID NOT NULL,
    "language" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "cdnUrl" TEXT,
    "completedUrl" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "access" "EnumAwsS3Accessibility" NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "term_policy_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_policy_recipients" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "termPolicyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "sentAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "claimNonce" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "term_policy_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_policy_user_acceptances" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "termPolicyId" UUID NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "term_policy_user_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isEnable" BOOLEAN NOT NULL DEFAULT true,
    "rolloutPercent" INTEGER NOT NULL DEFAULT 100,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_users" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "featureFlagId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "feature_flag_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forgot_passwords" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "to" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "resetAt" TIMESTAMP(3),
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "forgot_passwords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "type" "EnumNotificationType" NOT NULL,
    "priority" "EnumNotificationPriority" NOT NULL DEFAULT 'normal',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "notificationId" UUID NOT NULL,
    "channel" "EnumNotificationChannel" NOT NULL,
    "sentAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "failureTokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_user_settings" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "channel" "EnumNotificationChannel" NOT NULL,
    "type" "EnumNotificationType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "notification_user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "EnumWorkspaceMemberRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invites" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "workspaceId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "workspaceRole" "EnumWorkspaceMemberRole" NOT NULL,
    "projectId" UUID,
    "projectRole" "EnumProjectMemberRole",
    "token" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "status" "EnumWorkspaceInviteStatus" NOT NULL DEFAULT 'pending',
    "invitedByUserId" UUID NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" UUID,
    "nonce" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "workspace_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_join_requests" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "EnumWorkspaceJoinRequestStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "rejectReasonCode" "EnumWorkspaceJoinRejectReason",
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "nonce" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "workspace_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "projectId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "EnumProjectMemberRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outboxes" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "queue" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "priority" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "EnumOutboxStatus" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "enqueuedAt" TIMESTAMP(3),
    "sweptAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "outboxes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_keys_isActive_type_createdAt_id_idx" ON "api_keys"("isActive", "type", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "api_keys_createdAt_id_idx" ON "api_keys"("createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "api_keys_name_id_idx" ON "api_keys"("name", "id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_hash_key" ON "api_keys"("hash");

-- CreateIndex
CREATE INDEX "roles_type_createdAt_id_idx" ON "roles"("type", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "policies_roleId_subject_key" ON "policies"("roleId", "subject");

-- CreateIndex
CREATE INDEX "countries_name_idx" ON "countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "countries_alpha2Code_key" ON "countries"("alpha2Code");

-- CreateIndex
CREATE UNIQUE INDEX "countries_alpha3Code_key" ON "countries"("alpha3Code");

-- CreateIndex
CREATE UNIQUE INDEX "user_mobile_numbers_userId_countryId_phoneCode_number_key" ON "user_mobile_numbers"("userId", "countryId", "phoneCode", "number");

-- CreateIndex
CREATE UNIQUE INDEX "user_socials_provider_subject_key" ON "user_socials"("provider", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "user_socials_userId_provider_key" ON "user_socials"("userId", "provider");

-- CreateIndex
CREATE INDEX "users_deletedAt_createdAt_id_idx" ON "users"("deletedAt", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "users_deletedAt_name_id_idx" ON "users"("deletedAt", "name", "id");

-- CreateIndex
CREATE INDEX "users_status_deletedAt_createdAt_id_idx" ON "users"("status", "deletedAt", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "users_roleId_deletedAt_createdAt_id_idx" ON "users"("roleId", "deletedAt", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "users_countryId_deletedAt_createdAt_id_idx" ON "users"("countryId", "deletedAt", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "users_signUpAt_idx" ON "users"("signUpAt" DESC);

-- CreateIndex
CREATE INDEX "users_deletedAt_signUpAt_idx" ON "users"("deletedAt", "signUpAt" DESC);

-- CreateIndex
CREATE INDEX "users_deletedAt_passwordAttempt_idx" ON "users"("deletedAt", "passwordAttempt");

-- CreateIndex
CREATE INDEX "users_deletedAt_passwordLockedUntil_idx" ON "users"("deletedAt", "passwordLockedUntil");

-- CreateIndex
CREATE INDEX "users_deletedAt_lastLoginAt_idx" ON "users"("deletedAt", "lastLoginAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "verifications_token_idx" ON "verifications"("token");

-- CreateIndex
CREATE INDEX "verifications_userId_type_createdAt_idx" ON "verifications"("userId", "type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "verifications_userId_type_action_createdAt_idx" ON "verifications"("userId", "type", "action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "verifications_mobileNumberId_idx" ON "verifications"("mobileNumberId");

-- CreateIndex
CREATE INDEX "verifications_type_createdAt_idx" ON "verifications"("type", "createdAt");

-- CreateIndex
CREATE INDEX "verifications_expiredAt_idx" ON "verifications"("expiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_reference_key" ON "verifications"("reference");

-- CreateIndex
CREATE INDEX "password_histories_userId_expiredAt_id_idx" ON "password_histories"("userId", "expiredAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "password_histories_userId_createdAt_id_idx" ON "password_histories"("userId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "password_histories_type_createdAt_idx" ON "password_histories"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "password_histories_expiredAt_idx" ON "password_histories"("expiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "common_passwords_value_key" ON "common_passwords"("value");

-- CreateIndex
CREATE INDEX "auth_social_nonces_nonceHash_idx" ON "auth_social_nonces"("nonceHash");

-- CreateIndex
CREATE INDEX "auth_social_nonces_expiredAt_idx" ON "auth_social_nonces"("expiredAt");

-- CreateIndex
CREATE INDEX "activity_logs_userId_workspaceId_createdAt_id_idx" ON "activity_logs"("userId", "workspaceId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_userId_createdAt_id_idx" ON "activity_logs"("userId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_workspaceId_createdAt_id_idx" ON "activity_logs"("workspaceId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_action_createdAt_id_idx" ON "activity_logs"("action", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_workspaceId_idx" ON "activity_logs"("createdAt" DESC, "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "user_photos_userId_key" ON "user_photos"("userId");

-- CreateIndex
CREATE INDEX "sessions_userId_isRevoked_createdAt_id_idx" ON "sessions"("userId", "isRevoked", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "sessions_userId_isRevoked_expiredAt_idx" ON "sessions"("userId", "isRevoked", "expiredAt");

-- CreateIndex
CREATE INDEX "sessions_deviceOwnershipId_isRevoked_expiredAt_idx" ON "sessions"("deviceOwnershipId", "isRevoked", "expiredAt");

-- CreateIndex
CREATE INDEX "sessions_isRevoked_expiredAt_idx" ON "sessions"("isRevoked", "expiredAt");

-- CreateIndex
CREATE INDEX "sessions_expiredAt_idx" ON "sessions"("expiredAt");

-- CreateIndex
CREATE INDEX "sessions_createdAt_idx" ON "sessions"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_userId_jtiDigest_key" ON "sessions"("userId", "jtiDigest");

-- CreateIndex
CREATE INDEX "devices_createdAt_idx" ON "devices"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "devices_fingerprint_key" ON "devices"("fingerprint");

-- CreateIndex
CREATE INDEX "device_ownerships_userId_isRevoked_createdAt_id_idx" ON "device_ownerships"("userId", "isRevoked", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "device_ownerships_userId_lastActiveAt_id_idx" ON "device_ownerships"("userId", "lastActiveAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "device_ownerships_isRevoked_lastActiveAt_idx" ON "device_ownerships"("isRevoked", "lastActiveAt");

-- CreateIndex
CREATE INDEX "device_ownerships_notificationToken_lastActiveAt_idx" ON "device_ownerships"("notificationToken", "lastActiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "device_ownerships_deviceId_userId_key" ON "device_ownerships"("deviceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "mfas_userId_key" ON "mfas"("userId");

-- CreateIndex
CREATE INDEX "mfa_backup_codes_mfaId_usedAt_idx" ON "mfa_backup_codes"("mfaId", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_backup_codes_mfaId_codeHash_key" ON "mfa_backup_codes"("mfaId", "codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_totps_userId_key" ON "mfa_totps"("userId");

-- CreateIndex
CREATE INDEX "mfa_passkeys_userId_createdAt_id_idx" ON "mfa_passkeys"("userId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "mfa_passkeys_credentialId_key" ON "mfa_passkeys"("credentialId");

-- CreateIndex
CREATE INDEX "mfa_challenges_expiredAt_idx" ON "mfa_challenges"("expiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_challenges_tokenHash_key" ON "mfa_challenges"("tokenHash");

-- CreateIndex
CREATE INDEX "term_policies_type_status_version_idx" ON "term_policies"("type", "status", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "term_policies_type_version_key" ON "term_policies"("type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "term_policy_contents_termPolicyId_language_key" ON "term_policy_contents"("termPolicyId", "language");

-- CreateIndex
CREATE INDEX "term_policy_recipients_termPolicyId_batchId_userId_idx" ON "term_policy_recipients"("termPolicyId", "batchId", "userId");

-- CreateIndex
CREATE INDEX "term_policy_recipients_userId_idx" ON "term_policy_recipients"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "term_policy_recipients_termPolicyId_userId_key" ON "term_policy_recipients"("termPolicyId", "userId");

-- CreateIndex
CREATE INDEX "term_policy_user_acceptances_termPolicyId_acceptedAt_idx" ON "term_policy_user_acceptances"("termPolicyId", "acceptedAt" DESC);

-- CreateIndex
CREATE INDEX "term_policy_user_acceptances_userId_createdAt_id_idx" ON "term_policy_user_acceptances"("userId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "term_policy_user_acceptances_acceptedAt_idx" ON "term_policy_user_acceptances"("acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "term_policy_user_acceptances_userId_termPolicyId_key" ON "term_policy_user_acceptances"("userId", "termPolicyId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flag_users_userId_idx" ON "feature_flag_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_users_featureFlagId_userId_key" ON "feature_flag_users"("featureFlagId", "userId");

-- CreateIndex
CREATE INDEX "forgot_passwords_token_idx" ON "forgot_passwords"("token");

-- CreateIndex
CREATE INDEX "forgot_passwords_userId_createdAt_idx" ON "forgot_passwords"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "forgot_passwords_createdAt_idx" ON "forgot_passwords"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "forgot_passwords_expiredAt_idx" ON "forgot_passwords"("expiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "forgot_passwords_reference_key" ON "forgot_passwords"("reference");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_id_idx" ON "notifications"("userId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_id_idx" ON "notifications"("userId", "isRead", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_notificationId_channel_key" ON "notification_deliveries"("notificationId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "notification_user_settings_userId_channel_type_key" ON "notification_user_settings"("userId", "channel", "type");

-- CreateIndex
CREATE INDEX "workspaces_isPublic_createdAt_id_idx" ON "workspaces"("isPublic", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "workspaces_deletedAt_createdAt_id_idx" ON "workspaces"("deletedAt", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "workspaces_name_id_idx" ON "workspaces"("name", "id");

-- CreateIndex
CREATE INDEX "workspaces_createdAt_id_idx" ON "workspaces"("createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspace_members_userId_role_idx" ON "workspace_members"("userId", "role");

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_role_createdAt_id_idx" ON "workspace_members"("workspaceId", "role", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_createdAt_id_idx" ON "workspace_members"("workspaceId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_joinedAt_id_idx" ON "workspace_members"("workspaceId", "joinedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspaceId_userId_key" ON "workspace_members"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "workspace_invites_workspaceId_status_createdAt_id_idx" ON "workspace_invites"("workspaceId", "status", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "workspace_invites_workspaceId_createdAt_id_idx" ON "workspace_invites"("workspaceId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "workspace_invites_email_status_idx" ON "workspace_invites"("email", "status");

-- CreateIndex
CREATE INDEX "workspace_invites_status_expiredAt_idx" ON "workspace_invites"("status", "expiredAt");

-- CreateIndex
CREATE INDEX "workspace_invites_projectId_idx" ON "workspace_invites"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invites_token_key" ON "workspace_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invites_reference_key" ON "workspace_invites"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invites_nonce_key" ON "workspace_invites"("nonce");

-- CreateIndex
CREATE INDEX "workspace_join_requests_workspaceId_status_createdAt_id_idx" ON "workspace_join_requests"("workspaceId", "status", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "workspace_join_requests_workspaceId_createdAt_id_idx" ON "workspace_join_requests"("workspaceId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "workspace_join_requests_userId_status_idx" ON "workspace_join_requests"("userId", "status");

-- CreateIndex
CREATE INDEX "workspace_join_requests_status_expiredAt_idx" ON "workspace_join_requests"("status", "expiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_join_requests_nonce_key" ON "workspace_join_requests"("nonce");

-- CreateIndex
CREATE INDEX "projects_workspaceId_deletedAt_createdAt_id_idx" ON "projects"("workspaceId", "deletedAt", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "projects_createdAt_id_idx" ON "projects"("createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "projects_workspaceId_slug_key" ON "projects"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "project_members_userId_idx" ON "project_members"("userId");

-- CreateIndex
CREATE INDEX "project_members_projectId_role_createdAt_id_idx" ON "project_members"("projectId", "role", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "project_members_projectId_createdAt_id_idx" ON "project_members"("projectId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "project_members_projectId_joinedAt_id_idx" ON "project_members"("projectId", "joinedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_projectId_userId_key" ON "project_members"("projectId", "userId");

-- CreateIndex
CREATE INDEX "outboxes_status_sweptAt_createdAt_idx" ON "outboxes"("status", "sweptAt", "createdAt");

-- CreateIndex
CREATE INDEX "outboxes_status_sweptAt_enqueuedAt_idx" ON "outboxes"("status", "sweptAt", "enqueuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "outboxes_queue_name_idempotencyKey_key" ON "outboxes"("queue", "name", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mobile_numbers" ADD CONSTRAINT "user_mobile_numbers_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mobile_numbers" ADD CONSTRAINT "user_mobile_numbers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_socials" ADD CONSTRAINT "user_socials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_lastWorkspaceId_fkey" FOREIGN KEY ("lastWorkspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_mobileNumberId_fkey" FOREIGN KEY ("mobileNumberId") REFERENCES "user_mobile_numbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_histories" ADD CONSTRAINT "password_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_photos" ADD CONSTRAINT "user_photos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_deviceOwnershipId_fkey" FOREIGN KEY ("deviceOwnershipId") REFERENCES "device_ownerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_ownerships" ADD CONSTRAINT "device_ownerships_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_ownerships" ADD CONSTRAINT "device_ownerships_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_ownerships" ADD CONSTRAINT "device_ownerships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfas" ADD CONSTRAINT "mfas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_backup_codes" ADD CONSTRAINT "mfa_backup_codes_mfaId_fkey" FOREIGN KEY ("mfaId") REFERENCES "mfas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_totps" ADD CONSTRAINT "mfa_totps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_passkeys" ADD CONSTRAINT "mfa_passkeys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_challenges" ADD CONSTRAINT "mfa_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_policy_contents" ADD CONSTRAINT "term_policy_contents_termPolicyId_fkey" FOREIGN KEY ("termPolicyId") REFERENCES "term_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_policy_recipients" ADD CONSTRAINT "term_policy_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_policy_user_acceptances" ADD CONSTRAINT "term_policy_user_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_policy_user_acceptances" ADD CONSTRAINT "term_policy_user_acceptances_termPolicyId_fkey" FOREIGN KEY ("termPolicyId") REFERENCES "term_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flag_users" ADD CONSTRAINT "feature_flag_users_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flag_users" ADD CONSTRAINT "feature_flag_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forgot_passwords" ADD CONSTRAINT "forgot_passwords_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_user_settings" ADD CONSTRAINT "notification_user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_join_requests" ADD CONSTRAINT "workspace_join_requests_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_join_requests" ADD CONSTRAINT "workspace_join_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_join_requests" ADD CONSTRAINT "workspace_join_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
