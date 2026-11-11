import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IActivityLogMetadata,
    IActivityLogStageInput,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { UserSocialLoginContract } from '@modules/user/contracts/user.social-login.contract';
import { UserUsernameRegex } from '@modules/user/constants/user.constant';
import type {
    IUser,
    IUserDeletedIdentity,
    IUserPasswordSet,
    IUserTwoFactorEnabled,
    IUserTwoFactorStatus,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserLoginWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { TwoFactor, User } from '@generated/prisma-client/client';
import { Profanity } from '@2toad/profanity';
import { Duration } from 'luxon';

@Injectable()
export class UserUtil {
    private readonly profanity: Profanity;

    private readonly uploadPhotoProfilePath: string;
    private readonly photoMaxSizeInBytes: number;
    private readonly deleteSelfEmailPattern: string;
    private readonly deleteSelfUsernamePattern: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService
    ) {
        const availableLanguages = this.configService.get<string[]>(
            'message.availableLanguage'
        )!;
        this.uploadPhotoProfilePath = this.configService.get<string>(
            'user.uploadPhotoProfilePath'
        )!;
        this.photoMaxSizeInBytes = this.configService.get<number>(
            'user.photo.maxSizeInBytes'
        )!;
        this.deleteSelfEmailPattern = this.configService.get<string>(
            'user.deleteSelf.emailPattern'
        )!;
        this.deleteSelfUsernamePattern = this.configService.get<string>(
            'user.deleteSelf.usernamePattern'
        )!;
        this.profanity = new Profanity({
            languages: availableLanguages,
            wholeWord: false,
            grawlix: '*****',
            grawlixChar: '*',
        });
    }

    /** True when the username does not match the allowed pattern, so true rejects it. */
    checkUsernamePattern(username: string): boolean {
        return !!username.search(UserUsernameRegex);
    }

    buildPhotoProfilePath(userId: string): string {
        return this.uploadPhotoProfilePath.replace('{userId}', () => userId);
    }

    isPhotoProfileKeyOwned(userId: string, key: string): boolean {
        const photoPath = this.buildPhotoProfilePath(userId);

        return key.startsWith(`${photoPath}/`);
    }

    isPhotoSizeAllowed(size: number): boolean {
        return size <= this.photoMaxSizeInBytes;
    }

    async checkBadWord(str: string): Promise<boolean> {
        return this.profanity.exists(str);
    }

    /** A null record maps to a disabled status; isPendingConfirmation is true while a pending secret is held. */
    mapTwoFactor(twoFactor: TwoFactor | null): IUserTwoFactorStatus {
        if (twoFactor === null) {
            return {
                isEnabled: false,
                isPendingConfirmation: false,
                backupCodesRemaining: 0,
                confirmedAt: null,
                lastUsedAt: null,
            };
        }

        return {
            isEnabled: twoFactor.enabled,
            isPendingConfirmation: !!twoFactor.pendingSecret,
            backupCodesRemaining: twoFactor.backupCodes.length,
            confirmedAt: twoFactor.confirmedAt,
            lastUsedAt: twoFactor.lastUsedAt,
        };
    }

    isUnverified(user: IUser): boolean {
        return !user.isVerified;
    }

    hasPassword(user: IUser): user is IUserPasswordSet {
        return user.password !== null;
    }

    buildPasswordLockoutStages(
        userId: string
    ): IActivityLogStageInput<EnumActivityLogAction>[] {
        return [
            {
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId,
                createdBy: userId,
            },
            {
                action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                userId,
                createdBy: userId,
            },
        ];
    }

    buildTwoFactorLockoutStages(
        userId: string
    ): IActivityLogStageInput<EnumActivityLogAction>[] {
        return [
            {
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId,
                createdBy: userId,
            },
            {
                action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                userId,
                createdBy: userId,
            },
        ];
    }

    isTwoFactorEnabled(user: IUser): user is IUserTwoFactorEnabled {
        return !!user.twoFactor?.enabled;
    }

    requiresTwoFactorSetup(user: IUserTwoFactorEnabled): boolean {
        return user.twoFactor.requiredSetup;
    }

    requiresTwoFactorVerification(user: IUser): boolean {
        return (
            user.twoFactor?.enabled === true &&
            user.twoFactor.requiredSetup === false
        );
    }

    createDeletedIdentity({
        id,
        email,
        username,
    }: IUser): IUserDeletedIdentity {
        const deletedEmail = this.helperStringService.fillPattern(
            this.deleteSelfEmailPattern,
            { id, email }
        );
        const deletedUsername = this.helperStringService.fillPattern(
            this.deleteSelfUsernamePattern,
            { id, username }
        );

        return { email: deletedEmail, username: deletedUsername };
    }

    isDeleteSelfRefused({ role }: IUser): boolean {
        return (
            role.type === EnumRoleType.admin ||
            role.type === EnumRoleType.superAdmin
        );
    }

    gatesPasswordExpiryOn(loginWith: EnumUserLoginWith): boolean {
        return loginWith === EnumUserLoginWith.credential;
    }

    revokesSessionsOn(status: EnumUserStatus): boolean {
        return status !== EnumUserStatus.active;
    }

    resolveStatusActivityLogAction(
        status: EnumUserStatus
    ): EnumActivityLogAction {
        return status === EnumUserStatus.blocked
            ? EnumActivityLogAction.userBlocked
            : EnumActivityLogAction.userUpdateStatus;
    }

    isInsideResendWindow(
        lastCreatedAt: Date,
        resendInMinutes: number
    ): boolean {
        const now = this.helperDateService.create();
        const canResendAt = this.helperDateService.forward(
            lastCreatedAt,
            Duration.fromObject({ minutes: resendInMinutes })
        );

        return now < canResendAt;
    }

    checkMobileNumber(phoneCodes: string[], phoneCode: string): boolean {
        return phoneCodes.includes(phoneCode);
    }

    resolveLoginActivityLogAction(
        loginWith: EnumUserLoginWith
    ): EnumActivityLogAction {
        if (loginWith === EnumUserLoginWith.credential) {
            return EnumActivityLogAction.userLoginCredential;
        }

        return UserSocialLoginContract[loginWith].loginAction;
    }

    mapActivityLogActorMetadata(user: User): IActivityLogMetadata {
        return {
            targetUserId: user.id,
            targetUsername: user.username,
            timestamp: user.updatedAt,
        };
    }

    mapActivityLogTargetMetadata(
        user: User,
        actorUserId: string
    ): IActivityLogMetadata {
        return {
            actorUserId,
            timestamp: user.updatedAt,
        };
    }
}
