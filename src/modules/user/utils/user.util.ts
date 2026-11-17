import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserUsernameRegex } from '@modules/user/constants/user.constant';
import type { IUser } from '@modules/user/interfaces/user.interface';
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
        private readonly helperDateService: HelperDateService
    ) {
        const availableLanguages = this.configService.get<string[]>(
            'message.availableLanguage'
        )!;
        this.profanity = new Profanity({
            languages: availableLanguages,
            wholeWord: false,
            grawlix: '*****',
            grawlixChar: '*',
        });
    }

    /** True when the username does not match the allowed pattern, so true rejects it. */
    isUsernamePatternInvalid(username: string): boolean {
        return !!username.search(UserUsernameRegex);
    }

    hasBadWord(str: string): boolean {
        return this.profanity.exists(str);
    }

    isUnverified(user: IUser): boolean {
        return !user.isVerified;
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
