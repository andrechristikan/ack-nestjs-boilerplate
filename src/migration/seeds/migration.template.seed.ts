import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { EmailTemplateService } from '@modules/email/services/email.template.service';
import { TermPolicyTemplateService } from '@modules/term-policy/services/term-policy.template.service';
import { join } from 'path';
import { readFileSync } from 'fs';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { ConfigService } from '@nestjs/config';
import { AwsS3Service } from '@modules/aws/services/aws.s3.service';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@modules/aws/enums/aws.enum';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { CountryDoc } from '@modules/country/repository/entities/country.entity';
import { CountryService } from '@modules/country/services/country.service';

@Injectable()
export class MigrationTemplateSeed {
    constructor(
        private readonly countryService: CountryService,
        private readonly configService: ConfigService,
        private readonly emailTemplateService: EmailTemplateService,
        private readonly termPolicyTemplateService: TermPolicyTemplateService,
        private readonly termPolicyService: TermPolicyService,
        private readonly awsS3Service: AwsS3Service
    ) {}

    @Command({
        command: 'migrate:emailTemplate',
        describe: 'migrate email templates',
    })
    async migrateEmail(): Promise<void> {
        try {
            await this.emailTemplateService.importWelcome();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailTemplateService.importCreate();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailTemplateService.importChangePassword();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailTemplateService.importTempPassword();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailTemplateService.importResetPassword();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailTemplateService.importVerification();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailTemplateService.importEmailVerified();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailTemplateService.importMobileNumberVerified();
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }

    @Command({
        command: 'migrate:termPolicyTemplate',
        describe: 'migrate term policy templates',
    })
    async migrateTermPolicy(): Promise<void> {
        try {
            const country: CountryDoc =
                await this.countryService.findOneByAlpha2('ID');

            const term =
                this.termPolicyTemplateService.createDocumentFilenameForMigration(
                    ENUM_TERM_POLICY_TYPE.TERM,
                    country.alpha2Code,
                    ENUM_MESSAGE_LANGUAGE.EN,
                    'application/pdf'
                );
            const privacy =
                this.termPolicyTemplateService.createDocumentFilenameForMigration(
                    ENUM_TERM_POLICY_TYPE.PRIVACY,
                    country.alpha2Code,
                    ENUM_MESSAGE_LANGUAGE.EN,
                    'application/pdf'
                );
            const cookies =
                this.termPolicyTemplateService.createDocumentFilenameForMigration(
                    ENUM_TERM_POLICY_TYPE.COOKIES,
                    country.alpha2Code,
                    ENUM_MESSAGE_LANGUAGE.EN,
                    'application/pdf'
                );
            const marketing =
                this.termPolicyTemplateService.createDocumentFilenameForMigration(
                    ENUM_TERM_POLICY_TYPE.MARKETING,
                    country.alpha2Code,
                    ENUM_MESSAGE_LANGUAGE.EN,
                    'application/pdf'
                );

            const templateTermFilePath = join(
                process.cwd(),
                'src/modules/term-policy/templates/term-policy.en-term.pdf'
            );
            const templatePrivacyFilePath = join(
                process.cwd(),
                'src/modules/term-policy/templates/term-policy.en-privacy.pdf'
            );
            const templateCookiesFilePath = join(
                process.cwd(),
                'src/modules/term-policy/templates/term-policy.en-cookies.pdf'
            );
            const templateMarketingFilePath = join(
                process.cwd(),
                'src/modules/term-policy/templates/term-policy.en-marketing.pdf'
            );

            const fileTerm = readFileSync(templateTermFilePath);
            const filePrivacy = readFileSync(templatePrivacyFilePath);
            const fileCookies = readFileSync(templateCookiesFilePath);
            const fileMarketing = readFileSync(templateMarketingFilePath);

            const [termAws, cookiesAws, privacyAws, marketingAws] =
                await Promise.all([
                    this.awsS3Service.putItem(
                        {
                            key: term,
                            file: fileTerm,
                            size: fileTerm.byteLength,
                        },
                        {
                            access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
                        }
                    ),
                    this.awsS3Service.putItem(
                        {
                            key: cookies,
                            file: fileCookies,
                            size: fileCookies.byteLength,
                        },
                        {
                            access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
                        }
                    ),
                    this.awsS3Service.putItem(
                        {
                            key: privacy,
                            file: filePrivacy,
                            size: filePrivacy.byteLength,
                        },
                        {
                            access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
                        }
                    ),
                    this.awsS3Service.putItem(
                        {
                            key: marketing,
                            file: fileMarketing,
                            size: fileMarketing.byteLength,
                        },
                        {
                            access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
                        }
                    ),
                ]);

            const [termPolicy, privacyPolicy, cookiesPolicy, marketingPolicy] =
                await Promise.all([
                    this.termPolicyService.findOne({
                        type: ENUM_TERM_POLICY_TYPE.TERM,
                        country: country,
                    }),
                    this.termPolicyService.findOne({
                        type: ENUM_TERM_POLICY_TYPE.PRIVACY,
                        country: country,
                    }),
                    this.termPolicyService.findOne({
                        type: ENUM_TERM_POLICY_TYPE.COOKIES,
                        country: country,
                    }),
                    this.termPolicyService.findOne({
                        type: ENUM_TERM_POLICY_TYPE.MARKETING,
                        country: country,
                    }),
                ]);

            await Promise.all([
                this.termPolicyService.updateDocument(
                    termPolicy,
                    ENUM_MESSAGE_LANGUAGE.EN,
                    termAws
                ),
                this.termPolicyService.updateDocument(
                    privacyPolicy,
                    ENUM_MESSAGE_LANGUAGE.EN,
                    privacyAws
                ),
                this.termPolicyService.updateDocument(
                    cookiesPolicy,
                    ENUM_MESSAGE_LANGUAGE.EN,
                    cookiesAws
                ),
                this.termPolicyService.updateDocument(
                    marketingPolicy,
                    ENUM_MESSAGE_LANGUAGE.EN,
                    marketingAws
                ),
            ]);
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }

    @Command({
        command: 'rollback:emailTemplate',
        describe: 'rollback email templates',
    })
    async rollbackEmail(): Promise<void> {
        try {
            await this.emailTemplateService.deleteWelcome();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailTemplateService.deleteCreate();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailTemplateService.deleteChangePassword();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailTemplateService.deleteTempPassword();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailTemplateService.deleteResetPassword();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailTemplateService.deleteVerification();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailTemplateService.deleteEmailVerified();
        } catch (err: any) {
            throw new Error(err);
        }

        try {
            await this.emailTemplateService.deleteMobileNumberVerified();
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }

    @Command({
        command: 'rollback:termPolicyTemplate',
        describe: 'rollback term policy templates',
    })
    async rollbackTermPolicy(): Promise<void> {
        try {
            const country = 'ID';

            const term =
                this.termPolicyTemplateService.createDocumentFilenameForMigration(
                    ENUM_TERM_POLICY_TYPE.TERM,
                    country,
                    ENUM_MESSAGE_LANGUAGE.EN,
                    'application/pdf'
                );
            const privacy =
                this.termPolicyTemplateService.createDocumentFilenameForMigration(
                    ENUM_TERM_POLICY_TYPE.PRIVACY,
                    country,
                    ENUM_MESSAGE_LANGUAGE.EN,
                    'application/pdf'
                );
            const cookies =
                this.termPolicyTemplateService.createDocumentFilenameForMigration(
                    ENUM_TERM_POLICY_TYPE.COOKIES,
                    country,
                    ENUM_MESSAGE_LANGUAGE.EN,
                    'application/pdf'
                );
            const marketing =
                this.termPolicyTemplateService.createDocumentFilenameForMigration(
                    ENUM_TERM_POLICY_TYPE.MARKETING,
                    country,
                    ENUM_MESSAGE_LANGUAGE.EN,
                    'application/pdf'
                );

            await this.awsS3Service.deleteItems(
                [term, privacy, cookies, marketing],
                {
                    access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
                }
            );
        } catch (err: any) {
            throw new Error(err);
        }
    }
}
