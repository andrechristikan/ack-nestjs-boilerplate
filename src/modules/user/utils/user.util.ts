import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import type {
    IUser,
    IUserMobileNumber,
    IUserName,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@generated/prisma-client/client';
import { Profanity } from '@2toad/profanity';
import { Duration } from 'luxon';

@Injectable()
export class UserUtil {
    private readonly profanity: Profanity;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService
    ) {
        const availableLanguages = this.configService.get<string[]>(
            'message.availableLanguages'
        )!;
        this.profanity = new Profanity({
            languages: availableLanguages,
            wholeWord: true,
            grawlix: '*****',
            grawlixChar: '*',
        });
    }

    normalizeEmail(email: string): string {
        return email.trim().toLowerCase();
    }

    toCensoredMobileNumber(mobileNumber: IUserMobileNumber): IUserMobileNumber {
        const number = this.helperStringService.censorMobileNumber(
            mobileNumber.number
        );

        return { ...mobileNumber, number };
    }

    toCensoredProfile(profile: IUserProfile): IUserProfile {
        const email = this.helperStringService.censorEmail(profile.email);
        const mobileNumbers = profile.mobileNumbers.map(mobileNumber =>
            this.toCensoredMobileNumber(mobileNumber)
        );

        return { ...profile, email, mobileNumbers };
    }

    hasBadWord(str: string): boolean {
        return this.profanity.exists(str.replace(/[^a-zA-Z]+/g, ' '));
    }

    getDisplayName(user: IUserName): string {
        return user.name ?? user.username;
    }

    isUnverified(user: IUser): boolean {
        return !user.isVerified;
    }

    /** True when the expiry date has passed; false when no expiry is set. */
    isPasswordExpired(passwordExpired: Date | null): boolean {
        if (!passwordExpired) {
            return false;
        }

        const today: Date = this.helperDateService.create();
        return today > passwordExpired;
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
