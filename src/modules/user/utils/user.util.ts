import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserUsernameRegex } from '@modules/user/constants/user.constant';
import type {
    IUser,
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

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
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

    isTwoFactorEnabled(user: IUser): user is IUserTwoFactorEnabled {
        return !!user.twoFactor?.enabled;
    }

    requiresTwoFactorSetup(user: IUserTwoFactorEnabled): boolean {
        return user.twoFactor.requiredSetup;
    }

    isDeleteSelfRefused({ role }: IUser): boolean {
        return (
            role.type === EnumRoleType.admin ||
            role.type === EnumRoleType.superAdmin
        );
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

    /** Whole minutes, rounded up, left before a resend is allowed after `lastCreatedAt`; null once the window has passed. */
    getResendWaitInMinutes(
        lastCreatedAt: Date,
        resendInMinutes: number
    ): number | null {
        const now = this.helperDateService.create();
        const canResendAt = this.helperDateService.forward(
            lastCreatedAt,
            Duration.fromObject({ minutes: resendInMinutes })
        );
        if (now >= canResendAt) {
            return null;
        }

        const wait = this.helperDateService.diff(canResendAt, now);

        return Math.ceil(wait.as('minutes'));
    }

    checkMobileNumber(phoneCodes: string[], phoneCode: string): boolean {
        return phoneCodes.includes(phoneCode);
    }

    resolveLoginActivityLogAction(
        loginWith: EnumUserLoginWith
    ): EnumActivityLogAction {
        switch (loginWith) {
            case EnumUserLoginWith.socialApple:
                return EnumActivityLogAction.userLoginApple;
            case EnumUserLoginWith.socialGoogle:
                return EnumActivityLogAction.userLoginGoogle;
            case EnumUserLoginWith.credential:
            default:
                return EnumActivityLogAction.userLoginCredential;
        }
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
