import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumVerificationType } from '@generated/prisma-client/client';
import type {
    IUserVerificationEmailCreate,
    IUserVerificationMobileNumberCreate,
} from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import ms from 'ms';

/** Generates verification references, codes, tokens, and expiry, and shapes the email and mobile number verification payloads. */
@Injectable()
export class UserVerificationUtil {
    private readonly homeUrl: string;
    private readonly verificationReferencePrefix: string;
    private readonly verificationReferenceLength: number;
    private readonly verificationOtpLength: number;
    private readonly verificationExpiredInMinutes: number;
    private readonly verificationTokenLength: number;
    private readonly verificationResendInMinutes: number;
    private readonly verificationLinkPattern: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly helperNumberService: HelperNumberService,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService
    ) {
        this.homeUrl = this.configService.get<string>('home.url')!;

        this.verificationReferencePrefix = this.configService.get<string>(
            'verification.reference.prefix'
        )!;
        this.verificationReferenceLength = this.configService.get<number>(
            'verification.reference.length'
        )!;
        this.verificationOtpLength = this.configService.get<number>(
            'verification.otpLength'
        )!;
        const verificationExpiredInMs = this.configService.get<number>(
            'verification.expiredInMs'
        )!;
        this.verificationExpiredInMinutes = verificationExpiredInMs / ms('1m');
        this.verificationTokenLength = this.configService.get<number>(
            'verification.tokenLength'
        )!;
        const verificationResendInMs = this.configService.get<number>(
            'verification.resendInMs'
        )!;
        this.verificationResendInMinutes = verificationResendInMs / ms('1m');
        this.verificationLinkPattern = this.configService.get<string>(
            'verification.linkPattern'
        )!;
    }

    createReference(): string {
        const random = this.helperStringService.random(
            this.verificationReferenceLength
        );

        return `${this.verificationReferencePrefix}-${random}`;
    }

    createOtp(): string {
        return this.helperNumberService.randomDigits(
            this.verificationOtpLength
        );
    }

    createToken(): string {
        return this.helperStringService.random(this.verificationTokenLength);
    }

    createExpiredAt(): Date {
        const now = this.helperDateService.create();

        return this.helperDateService.forward(
            now,
            Duration.fromObject({ minutes: this.verificationExpiredInMinutes })
        );
    }

    /** Builds the OTP verification of a mobile number. */
    createMobile(): IUserVerificationMobileNumberCreate {
        const token = this.createOtp();
        const hashedToken = this.helperHashService.sha256Hash(token);
        const reference = this.createReference();
        const expiredAt = this.createExpiredAt();

        return {
            reference,
            expiredAt,
            type: EnumVerificationType.mobileNumber,
            token,
            hashedToken,
            expiredInMinutes: this.verificationExpiredInMinutes,
            resendInMinutes: this.verificationResendInMinutes,
        };
    }

    /** Builds the tokenized link verification of an email. */
    createEmail(): IUserVerificationEmailCreate {
        const token = this.createToken();
        const hashedToken = this.helperHashService.sha256Hash(token);
        const link = this.helperStringService.fillPattern(
            this.verificationLinkPattern,
            { homeUrl: this.homeUrl, token }
        );
        const reference = this.createReference();
        const expiredAt = this.createExpiredAt();

        return {
            reference,
            expiredAt,
            type: EnumVerificationType.email,
            token,
            hashedToken,
            expiredInMinutes: this.verificationExpiredInMinutes,
            link,
            resendInMinutes: this.verificationResendInMinutes,
        };
    }

    /** Builds the used-and-verified email verification an admin-created or seeded account is verified by. */
    createVerified(email: string): IUserCreateVerification {
        const token = this.createToken();
        const reference = this.createReference();
        const hashedToken = this.helperHashService.sha256Hash(token);
        const expiredAt = this.createExpiredAt();
        const verifiedAt = this.helperDateService.create();

        return {
            reference,
            token: hashedToken,
            type: EnumVerificationType.email,
            to: email,
            expiredAt,
            verifiedAt,
            isUsed: true,
        };
    }
}
