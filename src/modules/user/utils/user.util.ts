import { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    IUserForgotPasswordCreate,
    IUserTwoFactorStatus,
    IUserVerificationCreate,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumActivityLogAction,
    EnumUserLoginWith,
    EnumVerificationType,
    TwoFactor,
    User,
} from '@generated/prisma-client';
import { Duration } from 'luxon';
import ms from 'ms';
import { Profanity } from '@2toad/profanity';

/** Username/verification/forgot-password token generation, response mapping, and profanity checks. */
@Injectable()
export class UserUtil {
    private readonly usernamePattern: RegExp;
    private readonly uploadPhotoProfilePath: string;

    private readonly homeUrl: string;

    private readonly forgotPasswordReferencePrefix: string;
    private readonly forgotPasswordReferenceLength: number;
    private readonly forgotExpiredInMinutes: number;
    private readonly forgotTokenLength: number;
    readonly forgotResendInMinutes: number;
    private readonly forgotLinkBaseUrl: string;

    private readonly verificationReferencePrefix: string;
    private readonly verificationReferenceLength: number;
    private readonly verificationOtpLength: number;
    readonly verificationExpiredInMinutes: number;
    private readonly verificationTokenLength: number;
    private readonly verificationResendInMinutes: number;
    private readonly verificationLinkBaseUrl: string;

    private readonly profanity: Profanity;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperDateService: HelperDateService,
        private readonly helperNumberService: HelperNumberService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly fileService: FileService
    ) {
        this.usernamePattern = this.configService.get<RegExp>(
            'user.usernamePattern'
        )!;
        this.uploadPhotoProfilePath = this.configService.get<string>(
            'user.uploadPhotoProfilePath'
        )!;

        this.homeUrl = this.configService.get<string>('home.url')!;

        this.forgotPasswordReferencePrefix = this.configService.get<string>(
            'forgotPassword.reference.prefix'
        )!;
        this.forgotPasswordReferenceLength = this.configService.get<number>(
            'forgotPassword.reference.length'
        )!;
        this.forgotExpiredInMinutes =
            this.configService.get<number>('forgotPassword.expiredInMs')! /
            ms('1m');
        this.forgotTokenLength = this.configService.get<number>(
            'forgotPassword.tokenLength'
        )!;
        this.forgotResendInMinutes =
            this.configService.get<number>('forgotPassword.resendInMs')! /
            ms('1m');
        this.forgotLinkBaseUrl = this.configService.get<string>(
            'forgotPassword.linkBaseUrl'
        )!;

        this.verificationReferencePrefix = this.configService.get<string>(
            'verification.reference.prefix'
        )!;
        this.verificationReferenceLength = this.configService.get<number>(
            'verification.reference.length'
        )!;
        this.verificationOtpLength = this.configService.get<number>(
            'verification.otpLength'
        )!;
        this.verificationExpiredInMinutes =
            this.configService.get<number>('verification.expiredInMs')! /
            ms('1m');
        this.verificationTokenLength = this.configService.get<number>(
            'verification.tokenLength'
        )!;
        this.verificationResendInMinutes =
            this.configService.get<number>('verification.resendInMs')! /
            ms('1m');
        this.verificationLinkBaseUrl = this.configService.get<string>(
            'verification.linkBaseUrl'
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

    createRandomFilenamePhotoProfileWithPath(
        user: string,
        { extension }: IFileRandomFilenameOptions
    ): string {
        const path: string = this.uploadPhotoProfilePath.replace(
            '{userId}',
            user
        );
        return this.fileService.createRandomFilename({
            path,
            extension,
            randomLength: 20,
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
    mapTwoFactor(twoFactor: TwoFactor): IUserTwoFactorStatus {
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

    forgotPasswordCreateReference(): string {
        const random = this.helperStringService.random(
            this.forgotPasswordReferenceLength
        );

        return `${this.forgotPasswordReferencePrefix}-${random}`;
    }

    forgotPasswordCreateToken(): string {
        return this.helperStringService.random(this.forgotTokenLength);
    }

    forgotPasswordSetExpiredDate(): Date {
        const now = this.helperDateService.create();

        return this.helperDateService.forward(
            now,
            Duration.fromObject({ minutes: this.forgotExpiredInMinutes })
        );
    }

    forgotPasswordCreate(userId: string): IUserForgotPasswordCreate {
        const token = this.forgotPasswordCreateToken();
        const hashedToken = this.helperHashService.sha256Hash(token);
        const link = `${this.homeUrl}/${this.forgotLinkBaseUrl}/${token}`;
        const encryptedLink = this.encryptedLink(userId, link);

        return {
            reference: this.forgotPasswordCreateReference(),
            expiredAt: this.forgotPasswordSetExpiredDate(),
            token,
            hashedToken,
            expiredInMinutes: this.forgotExpiredInMinutes,
            resendInMinutes: this.forgotResendInMinutes,
            link,
            encryptedLink,
        };
    }

    verificationCreateReference(): string {
        const random = this.helperStringService.random(
            this.verificationReferenceLength
        );

        return `${this.verificationReferencePrefix}-${random}`;
    }

    verificationCreateOtp(): string {
        return this.helperNumberService.randomDigits(
            this.verificationOtpLength
        );
    }

    verificationCreateToken(): string {
        return this.helperStringService.random(this.verificationTokenLength);
    }

    verificationSetExpiredDate(): Date {
        const now = this.helperDateService.create();

        return this.helperDateService.forward(
            now,
            Duration.fromObject({ minutes: this.verificationExpiredInMinutes })
        );
    }

    /** Builds an OTP verification for mobile numbers or a tokenized link verification for email. */
    verificationCreateVerification(
        userId: string,
        type: EnumVerificationType
    ): IUserVerificationCreate {
        if (type === EnumVerificationType.mobileNumber) {
            const token = this.verificationCreateOtp();
            const hashedToken = this.hashedToken(token);

            return {
                reference: this.verificationCreateReference(),
                expiredAt: this.verificationSetExpiredDate(),
                type: EnumVerificationType.mobileNumber,
                token,
                hashedToken,
                expiredInMinutes: this.verificationExpiredInMinutes,
                resendInMinutes: this.verificationResendInMinutes,
            };
        }

        const token = this.verificationCreateToken();
        const hashedToken = this.hashedToken(token);
        const link = `${this.homeUrl}/${this.verificationLinkBaseUrl}/${token}`;
        const encryptedLink = this.encryptedLink(userId, link ?? '');

        return {
            reference: this.verificationCreateReference(),
            expiredAt: this.verificationSetExpiredDate(),
            type: EnumVerificationType.email,
            token,
            hashedToken,
            expiredInMinutes: this.verificationExpiredInMinutes,
            link: link,
            encryptedLink: encryptedLink,
            resendInMinutes: this.verificationResendInMinutes,
        };
    }

    hashedToken(token: string): string {
        return this.helperHashService.sha256Hash(token);
    }

    /** Encrypts a verification link using the userId as the key. */
    encryptedLink(userId: string, token: string): string {
        return this.helperEncryptionService.aes256EncryptSimple(token, userId);
    }

    /** Decrypts a verification link encrypted with the userId as the key. */
    decryptedLink(userId: string, encoded: string): string {
        return this.helperEncryptionService.aes256DecryptSimple(
            encoded,
            userId
        );
    }
}
