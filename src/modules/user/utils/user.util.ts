import { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import { HelperService } from '@common/helper/services/helper.service';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserDto } from '@modules/user/dtos/user.dto';
import { UserMobileNumberResponseDto } from '@modules/user/dtos/user.mobile-number.dto';
import {
    IUser,
    IUserForgotPasswordCreate,
    IUserMobileNumber,
    IUserProfile,
    IUserVerificationCreate,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumVerificationType,
    TwoFactor,
    User,
} from '@generated/prisma-client';
import { ResponseUtil } from '@common/response/utils/response.util';
import { Duration } from 'luxon';
import { Profanity } from '@2toad/profanity';
import { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import { UserExportResponseDto } from '@modules/user/dtos/response/user.export.response.dto';

/** Username/verification/forgot-password token generation, response mapping, and profanity checks. */
@Injectable()
export class UserUtil {
    private readonly usernamePrefix: string;
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
        private readonly helperService: HelperService,
        private readonly fileService: FileService,
        private readonly responseUtil: ResponseUtil
    ) {
        this.usernamePrefix =
            this.configService.get<string>('user.usernamePrefix')!;
        this.usernamePattern =
            this.configService.get<RegExp>('user.usernamePattern')!;
        this.uploadPhotoProfilePath =
            this.configService.get<string>('user.uploadPhotoProfilePath')!;

        this.homeUrl = this.configService.get<string>('home.url')!;

        this.forgotPasswordReferencePrefix = this.configService.get<string>(
            'forgotPassword.reference.prefix'
        )!;
        this.forgotPasswordReferenceLength = this.configService.get<number>(
            'forgotPassword.reference.length'
        )!;
        this.forgotExpiredInMinutes = this.configService.get<number>(
            'forgotPassword.expiredInMinutes'
        )!;
        this.forgotTokenLength = this.configService.get<number>(
            'forgotPassword.tokenLength'
        )!;
        this.forgotResendInMinutes = this.configService.get<number>(
            'forgotPassword.resendInMinutes'
        )!;
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
        this.verificationExpiredInMinutes = this.configService.get<number>(
            'verification.expiredInMinutes'
        )!;
        this.verificationTokenLength = this.configService.get<number>(
            'verification.tokenLength'
        )!;
        this.verificationResendInMinutes = this.configService.get<number>(
            'verification.resendInMinutes'
        )!;
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

    createRandomUsername(): string {
        const suffix = this.helperService.randomString(6);

        return `${this.usernamePrefix}-${suffix}`.toLowerCase();
    }

    /** True when the username does NOT match the allowed pattern (i.e. should be rejected). */
    checkUsernamePattern(username: string): boolean {
        return !!username.search(this.usernamePattern);
    }

    async checkBadWord(str: string): Promise<boolean> {
        return this.profanity.exists(str);
    }

    mapList(users: IUser[]): UserListResponseDto[] {
        return this.responseUtil.serialize(UserListResponseDto, users);
    }

    mapExport(users: IUser[]): UserExportResponseDto[] {
        return this.responseUtil.serialize(UserExportResponseDto, users);
    }

    mapOne(user: User): UserDto {
        return this.responseUtil.serialize(UserDto, user);
    }

    mapProfile(user: IUserProfile): UserProfileResponseDto {
        return this.responseUtil.serialize(UserProfileResponseDto, user);
    }

    mapMobileNumber(
        mobileNumber: IUserMobileNumber
    ): UserMobileNumberResponseDto {
        return this.responseUtil.serialize(
            UserMobileNumberResponseDto,
            mobileNumber
        );
    }

    /** Maps a two-factor record to status, deriving the pending-confirmation flag. */
    mapTwoFactor(twoFactor: TwoFactor): UserTwoFactorStatusResponseDto {
        return {
            isEnabled: twoFactor.enabled,
            isPendingConfirmation:
                !twoFactor.enabled &&
                !!twoFactor.secret &&
                !!twoFactor.iv &&
                !twoFactor.confirmedAt,
            backupCodesRemaining: twoFactor.backupCodes.length,
            confirmedAt: twoFactor.confirmedAt ?? undefined,
            lastUsedAt: twoFactor.lastUsedAt ?? undefined,
        };
    }

    checkMobileNumber(phoneCodes: string[], phoneCode: string): boolean {
        return phoneCodes.includes(phoneCode);
    }

    mapActivityLogMetadata(user: User): IActivityLogMetadata {
        return {
            userId: user.id,
            userUsername: user.username,
            timestamp: user.updatedAt ?? user.createdAt,
        };
    }

    forgotPasswordCreateReference(): string {
        const random = this.helperService.randomString(
            this.forgotPasswordReferenceLength
        );

        return `${this.forgotPasswordReferencePrefix}-${random}`;
    }

    forgotPasswordCreateToken(): string {
        return this.helperService.randomString(this.forgotTokenLength);
    }

    forgotPasswordSetExpiredDate(): Date {
        const now = this.helperService.dateCreate();

        return this.helperService.dateForward(
            now,
            Duration.fromObject({ minutes: this.forgotExpiredInMinutes })
        );
    }

    forgotPasswordCreate(userId: string): IUserForgotPasswordCreate {
        const token = this.forgotPasswordCreateToken();
        const hashedToken = this.helperService.sha256Hash(token);
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
        const random = this.helperService.randomString(
            this.verificationReferenceLength
        );

        return `${this.verificationReferencePrefix}-${random}`;
    }

    verificationCreateOtp(): string {
        return this.helperService.randomDigits(this.verificationOtpLength);
    }

    verificationCreateToken(): string {
        return this.helperService.randomString(this.verificationTokenLength);
    }

    verificationSetExpiredDate(): Date {
        const now = this.helperService.dateCreate();

        return this.helperService.dateForward(
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
        return this.helperService.sha256Hash(token);
    }

    /** Encrypts a verification link using the userId as the key. */
    encryptedLink(userId: string, token: string): string {
        return this.helperService.aes256EncryptSimple(token, userId);
    }

    /** Decrypts a verification link encrypted with the userId as the key. */
    decryptedLink(userId: string, encoded: string): string {
        return this.helperService.aes256DecryptSimple(encoded, userId);
    }
}
