import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IUserTwoFactorStatus } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumActivityLogAction,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { TwoFactor, User } from '@generated/prisma-client/client';
import { Profanity } from '@2toad/profanity';
import { Duration } from 'luxon';

/** Username checks, profile photo path, resend window, two-factor mapping, and activity-log mapping. */
@Injectable()
export class UserUtil {
    private readonly usernameRegex: RegExp;

    private readonly profanity: Profanity;

    private readonly uploadPhotoProfilePath: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {
        this.usernameRegex =
            this.configService.get<RegExp>('user.usernameRegex')!;

        const availableLanguages = this.configService.get<string[]>(
            'message.availableLanguage'
        )!;
        this.uploadPhotoProfilePath = this.configService.get<string>(
            'user.uploadPhotoProfilePath'
        )!;
        this.profanity = new Profanity({
            languages: availableLanguages,
            wholeWord: false,
            grawlix: '*****',
            grawlixChar: '*',
        });
    }

    /** True when the username does NOT match the allowed pattern (i.e. should be rejected). */
    checkUsernamePattern(username: string): boolean {
        return !!username.search(this.usernameRegex);
    }

    buildPhotoProfilePath(userId: string): string {
        return this.uploadPhotoProfilePath.replace('{userId}', () => userId);
    }

    /** True when the key sits under the profile photo path of the user. */
    isPhotoProfileKeyOwned(userId: string, key: string): boolean {
        const photoPath = this.buildPhotoProfilePath(userId);

        return key.startsWith(`${photoPath}/`);
    }

    async checkBadWord(str: string): Promise<boolean> {
        return this.profanity.exists(str);
    }

    /** Maps a two-factor record to status, deriving the pending-confirmation flag; a missing record is disabled. */
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

    /** Maps the login method onto the activity-log action that records it. */
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
