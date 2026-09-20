import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import type { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable, Logger } from '@nestjs/common';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class TermPolicyTemplateDomain {
    private readonly logger = new Logger(TermPolicyTemplateDomain.name);
    private readonly templatesDir = join(
        process.cwd(),
        'src/modules/term-policy/templates'
    );
    private readonly templateVersion = 1;

    constructor(
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly awsS3Service: AwsS3Service
    ) {}

    async importTermsOfService(): Promise<IAwsS3 | null> {
        try {
            const templatePath = join(
                this.templatesDir,
                'term-policy.term.en.hbs'
            );
            const templateContent = readFileSync(templatePath);
            const key = this.termPolicyUtil.createRandomFilenameContentWithPath(
                EnumTermPolicyType.termsOfService,
                this.templateVersion,
                EnumMessageLanguage.en,
                {
                    extension: EnumFileExtensionTemplate.hbs,
                }
            );

            const privateItem = await this.awsS3Service.putItem(
                {
                    file: templateContent,
                    key,
                    size: templateContent.length,
                },
                {
                    forceUpdate: true,
                    access: EnumAwsS3Accessibility.private,
                }
            );
            if (!privateItem) {
                return null;
            }

            const contentPublicPath = this.termPolicyUtil.getContentPublicPath(
                EnumTermPolicyType.termsOfService,
                this.templateVersion
            );

            return this.awsS3Service.copyItem(privateItem, contentPublicPath, {
                accessFrom: EnumAwsS3Accessibility.private,
                accessTo: EnumAwsS3Accessibility.public,
            });
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to import terms of service');

            throw err;
        }
    }

    async importPrivacy(): Promise<IAwsS3 | null> {
        try {
            const templatePath = join(
                this.templatesDir,
                'term-policy.privacy.en.hbs'
            );
            const templateContent = readFileSync(templatePath);
            const key = this.termPolicyUtil.createRandomFilenameContentWithPath(
                EnumTermPolicyType.privacy,
                this.templateVersion,
                EnumMessageLanguage.en,
                {
                    extension: EnumFileExtensionTemplate.hbs,
                }
            );

            const privateItem = await this.awsS3Service.putItem(
                {
                    file: templateContent,
                    key,
                    size: templateContent.length,
                },
                {
                    forceUpdate: true,
                    access: EnumAwsS3Accessibility.private,
                }
            );
            if (!privateItem) {
                return null;
            }

            const contentPublicPath = this.termPolicyUtil.getContentPublicPath(
                EnumTermPolicyType.privacy,
                this.templateVersion
            );

            return this.awsS3Service.copyItem(privateItem, contentPublicPath, {
                accessFrom: EnumAwsS3Accessibility.private,
                accessTo: EnumAwsS3Accessibility.public,
            });
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to import privacy');

            throw err;
        }
    }

    async importCookie(): Promise<IAwsS3 | null> {
        try {
            const templatePath = join(
                this.templatesDir,
                'term-policy.cookies.en.hbs'
            );
            const templateContent = readFileSync(templatePath);
            const key = this.termPolicyUtil.createRandomFilenameContentWithPath(
                EnumTermPolicyType.cookies,
                this.templateVersion,
                EnumMessageLanguage.en,
                {
                    extension: EnumFileExtensionTemplate.hbs,
                }
            );

            const privateItem = await this.awsS3Service.putItem(
                {
                    file: templateContent,
                    key,
                    size: templateContent.length,
                },
                {
                    forceUpdate: true,
                    access: EnumAwsS3Accessibility.private,
                }
            );
            if (!privateItem) {
                return null;
            }

            const contentPublicPath = this.termPolicyUtil.getContentPublicPath(
                EnumTermPolicyType.cookies,
                this.templateVersion
            );

            return this.awsS3Service.copyItem(privateItem, contentPublicPath, {
                accessFrom: EnumAwsS3Accessibility.private,
                accessTo: EnumAwsS3Accessibility.public,
            });
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to import cookie');

            throw err;
        }
    }

    async importMarketing(): Promise<IAwsS3 | null> {
        try {
            const templatePath = join(
                this.templatesDir,
                'term-policy.marketing.en.hbs'
            );
            const templateContent = readFileSync(templatePath);
            const key = this.termPolicyUtil.createRandomFilenameContentWithPath(
                EnumTermPolicyType.marketing,
                this.templateVersion,
                EnumMessageLanguage.en,
                {
                    extension: EnumFileExtensionTemplate.hbs,
                }
            );

            const privateItem = await this.awsS3Service.putItem(
                {
                    file: templateContent,
                    key,
                    size: templateContent.length,
                },
                {
                    forceUpdate: true,
                    access: EnumAwsS3Accessibility.private,
                }
            );
            if (!privateItem) {
                return null;
            }

            const contentPublicPath = this.termPolicyUtil.getContentPublicPath(
                EnumTermPolicyType.marketing,
                this.templateVersion
            );

            return this.awsS3Service.copyItem(privateItem, contentPublicPath, {
                accessFrom: EnumAwsS3Accessibility.private,
                accessTo: EnumAwsS3Accessibility.public,
            });
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to import marketing');

            throw err;
        }
    }
}
