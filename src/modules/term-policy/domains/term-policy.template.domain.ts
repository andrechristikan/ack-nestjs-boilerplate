import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import type { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable } from '@nestjs/common';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class TermPolicyTemplateDomain {
    private readonly templateVersion = 1;

    constructor(
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly awsS3Service: AwsS3Service
    ) {}

    async importTermsOfService(): Promise<IAwsS3 | null> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
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

            const publicItem = await this.awsS3Service.copyItem(
                privateItem,
                contentPublicPath,
                {
                    accessFrom: EnumAwsS3Accessibility.private,
                    accessTo: EnumAwsS3Accessibility.public,
                }
            );

            return publicItem;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(
                err,
                'Importing the terms of service template failed'
            );
        }
    }

    async importPrivacy(): Promise<IAwsS3 | null> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
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

            const publicItem = await this.awsS3Service.copyItem(
                privateItem,
                contentPublicPath,
                {
                    accessFrom: EnumAwsS3Accessibility.private,
                    accessTo: EnumAwsS3Accessibility.public,
                }
            );

            return publicItem;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(
                err,
                'Importing the privacy template failed'
            );
        }
    }

    async importCookie(): Promise<IAwsS3 | null> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
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

            const publicItem = await this.awsS3Service.copyItem(
                privateItem,
                contentPublicPath,
                {
                    accessFrom: EnumAwsS3Accessibility.private,
                    accessTo: EnumAwsS3Accessibility.public,
                }
            );

            return publicItem;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(
                err,
                'Importing the cookie template failed'
            );
        }
    }

    async importMarketing(): Promise<IAwsS3 | null> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
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

            const publicItem = await this.awsS3Service.copyItem(
                privateItem,
                contentPublicPath,
                {
                    accessFrom: EnumAwsS3Accessibility.private,
                    accessTo: EnumAwsS3Accessibility.public,
                }
            );

            return publicItem;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(
                err,
                'Importing the marketing template failed'
            );
        }
    }
}
