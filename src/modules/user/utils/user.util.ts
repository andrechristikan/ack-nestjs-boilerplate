import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    IUserTwoFactor,
    IUserTwoFactorStatus,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumActivityLogAction,
    EnumUserLoginWith,
    User,
} from '@generated/prisma-client';
import { Profanity } from '@2toad/profanity';

/** Username checks, two-factor mapping, and activity-log mapping. */
@Injectable()
export class UserUtil {
    private readonly usernamePattern: RegExp;

    private readonly profanity: Profanity;

    constructor(private readonly configService: ConfigService) {
        this.usernamePattern = this.configService.get<RegExp>(
            'user.usernamePattern'
        )!;

        const availableLanguages = this.configService.get<string[]>(
            'message.availableLanguage'
        );
        this.profanity = new Profanity({
            languages: availableLanguages,
            wholeWord: false,
            grawlix: '*****',
            grawlixChar: '*',
        });
    }

    /** True when the username does NOT match the allowed pattern (i.e. should be rejected). */
    checkUsernamePattern(username: string): boolean {
        return !!username.search(this.usernamePattern);
    }

    async checkBadWord(str: string): Promise<boolean> {
        return this.profanity.exists(str);
    }

    /** Maps a two-factor record to status, deriving the pending-confirmation flag. */
    mapTwoFactor(twoFactor: IUserTwoFactor): IUserTwoFactorStatus {
        return {
            isEnabled: twoFactor.enabled,
            isPendingConfirmation:
                !twoFactor.enabled &&
                !!twoFactor.secret &&
                !!twoFactor.iv &&
                !twoFactor.confirmedAt,
            backupCodesRemaining: twoFactor.backupCodes.length,
            confirmedAt: twoFactor.confirmedAt,
            lastUsedAt: twoFactor.lastUsedAt,
        };
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

    mapActivityLogMetadata(user: User): IActivityLogMetadata {
        return {
            userId: user.id,
            userUsername: user.username,
            timestamp: user.updatedAt ?? user.createdAt,
        };
    }
}
