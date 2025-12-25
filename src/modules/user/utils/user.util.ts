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
    PasswordHistory,
    TwoFactor,
    User,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { Duration } from 'luxon';
import { Profanity } from '@2toad/profanity';
import { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import { UserExportResponseDto } from '@modules/user/dtos/response/user.export.response.dto';

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
        private readonly fileService: FileService
    ) {
        this.usernamePrefix = this.configService.get<string>(
            'user.usernamePrefix'
        );
        this.usernamePattern = this.configService.get<RegExp>(
            'user.usernamePattern'
        );
        this.uploadPhotoProfilePath = this.configService.get<string>(
            'user.uploadPhotoProfilePath'
        );

        this.homeUrl = this.configService.get('home.url');

        this.forgotPasswordReferencePrefix = this.configService.get(
            'forgotPassword.reference.prefix'
        );
        this.forgotPasswordReferenceLength = this.configService.get(
            'forgotPassword.reference.length'
        );
        this.forgotExpiredInMinutes = this.configService.get(
            'forgotPassword.expiredInMinutes'
        );
        this.forgotTokenLength = this.configService.get(
            'forgotPassword.tokenLength'
        );
        this.forgotResendInMinutes = this.configService.get(
            'forgotPassword.resendInMinutes'
        );
        this.forgotLinkBaseUrl = this.configService.get(
            'forgotPassword.linkBaseUrl'
        );

        this.verificationReferencePrefix = this.configService.get(
            'verification.reference.prefix'
        );
        this.verificationReferenceLength = this.configService.get(
            'verification.reference.length'
        );
        this.verificationOtpLength = this.configService.get(
            'verification.otpLength'
        );
        this.verificationExpiredInMinutes = this.configService.get(
            'verification.expiredInMinutes'
        );
        this.verificationTokenLength = this.configService.get(
            'verification.tokenLength'
        );
        this.verificationResendInMinutes = this.configService.get(
            'verification.resendInMinutes'
        );
        this.verificationLinkBaseUrl = this.configService.get(
            'verification.linkBaseUrl'
        );

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

    checkUsernamePattern(username: string): boolean {
        return !!username.search(this.usernamePattern);
    }

    async checkBadWord(str: string): Promise<boolean> {
        return this.profanity.exists(str);
    }

    mapList(users: IUser[]): UserListResponseDto[] {
        return plainToInstance(UserListResponseDto, users);
    }

    mapExport(users: IUser[]): UserExportResponseDto[] {
        return plainToInstance(UserExportResponseDto, users);
    }

    mapOne(user: User): UserDto {
        return plainToInstance(UserDto, user);
    }

    mapProfile(user: IUserProfile): UserProfileResponseDto {
        return plainToInstance(UserProfileResponseDto, user);
    }

    mapMobileNumber(
        mobileNumber: IUserMobileNumber
    ): UserMobileNumberResponseDto {
        return plainToInstance(UserMobileNumberResponseDto, mobileNumber);
    }

    mapTwoFactor(twoFactor: TwoFactor): UserTwoFactorStatusResponseDto {
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

    mapActivityLogMetadata(user: User): IActivityLogMetadata {
        return {
            userId: user.id,
            userUsername: user.username,
            timestamp: user.updatedAt ?? user.createdAt,
        };
    }

    checkPasswordPeriod(
        histories: PasswordHistory[],
        password: string
    ): PasswordHistory | null {
        for (const history of histories) {
            if (this.helperService.bcryptCompare(password, history.password)) {
                return history;
            }
        }

        return null;
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
        const now = new Date();

        return this.helperService.dateForward(
            now,
            Duration.fromObject({ minutes: this.forgotExpiredInMinutes })
        );
    }

    forgotPasswordCreate(): IUserForgotPasswordCreate {
        const token = this.forgotPasswordCreateToken();

        return {
            reference: this.forgotPasswordCreateReference(),
            expiredAt: this.forgotPasswordSetExpiredDate(),
            token,
            expiredInMinutes: this.forgotExpiredInMinutes,
            resendInMinutes: this.forgotResendInMinutes,
            link: `${this.homeUrl}/${this.forgotLinkBaseUrl}/${token}`,
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
        const now = new Date();

        return this.helperService.dateForward(
            now,
            Duration.fromObject({ minutes: this.verificationExpiredInMinutes })
        );
    }

    verificationCreateVerification(
        type: EnumVerificationType
    ): IUserVerificationCreate {
        const token =
            type === EnumVerificationType.mobileNumber
                ? this.verificationCreateOtp()
                : this.verificationCreateToken();
        const link =
            type === EnumVerificationType.mobileNumber
                ? null
                : `${this.homeUrl}/${this.verificationLinkBaseUrl}/${token}`;

        return {
            reference: this.verificationCreateReference(),
            expiredAt: this.verificationSetExpiredDate(),
            type,
            token,
            expiredInMinutes: this.verificationExpiredInMinutes,
            link,
            resendInMinutes: this.verificationResendInMinutes,
        };
    }
}
