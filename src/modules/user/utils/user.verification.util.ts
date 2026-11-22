import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumVerificationType } from '@generated/prisma-client/client';
import type { INotificationVerificationLinkContext } from '@modules/notification/interfaces/notification.interface';
import type { IUserVerificationEmailCreate } from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';

@Injectable()
export class UserVerificationUtil {
    private readonly baseUrl: string;
    private readonly referencePrefix: string;
    private readonly referenceLength: number;
    private readonly expiresInMinutes: number;
    private readonly tokenLength: number;
    readonly resendInMinutes: number;
    private readonly linkPattern: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService
    ) {
        this.baseUrl = this.configService.get<string>('frontend.baseUrl')!;

        this.referencePrefix = this.configService.get<string>(
            'verification.reference.prefix'
        )!;
        this.referenceLength = this.configService.get<number>(
            'verification.reference.length'
        )!;
        this.expiresInMinutes = this.configService.get<number>(
            'verification.expiresInMinutes'
        )!;
        this.tokenLength = this.configService.get<number>(
            'verification.tokenLength'
        )!;
        this.resendInMinutes = this.configService.get<number>(
            'verification.resendInMinutes'
        )!;
        this.linkPattern = this.configService.get<string>(
            'verification.linkPattern'
        )!;
    }

    private createToken(): string {
        return this.helperStringService.random(this.tokenLength);
    }

    createReference(): string {
        const random = this.helperStringService.random(this.referenceLength);

        return `${this.referencePrefix}-${random}`;
    }

    createExpiredAt(): Date {
        const now = this.helperDateService.create();

        return this.helperDateService.forward(
            now,
            Duration.fromObject({ minutes: this.expiresInMinutes })
        );
    }

    createEmail(): IUserVerificationEmailCreate {
        const token = this.createToken();
        const hashedToken = this.helperHashService.sha256Hash(token);
        const link = this.helperStringService.fillPattern(this.linkPattern, {
            frontendBaseUrl: this.baseUrl,
            token,
        });
        const reference = this.createReference();
        const expiredAt = this.createExpiredAt();

        return {
            reference,
            expiredAt,
            type: EnumVerificationType.email,
            token,
            hashedToken,
            expiredInMinutes: this.expiresInMinutes,
            link,
            resendInMinutes: this.resendInMinutes,
        };
    }

    mapEmailContext(
        userId: string,
        verification: IUserVerificationEmailCreate
    ): INotificationVerificationLinkContext {
        const expiredAt = this.helperDateService.formatToIso(
            verification.expiredAt
        );

        return {
            userId,
            proceedBy: userId,
            link: verification.link,
            expiredAt,
            expiredInMinutes: verification.expiredInMinutes,
            reference: verification.reference,
        };
    }

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
            action: null,
            mobileNumberId: null,
            to: email,
            expiredAt,
            verifiedAt,
            isUsed: true,
        };
    }
}
