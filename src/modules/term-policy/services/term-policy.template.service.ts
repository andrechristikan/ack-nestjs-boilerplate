import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { ITermPolicyTemplateService } from '@modules/term-policy/interfaces/term-policy.template-service.interface';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Injectable, Logger } from '@nestjs/common';
import { EnumTermPolicyType } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class TermPolicyTemplateService implements ITermPolicyTemplateService {
    private readonly logger = new Logger(TermPolicyTemplateService.name);
    private readonly templatesDir = join(
        process.cwd(),
        'src/modules/term-policy/templates'
    );

    constructor(
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly awsS3Service: AwsS3Service
    ) {}

    async importTermsOfService(): Promise<AwsS3Dto> {
        try {
            const templatePath = join(
                this.templatesDir,
                'term-policy.term.en.hbs'
            );
            const templateContent = readFileSync(templatePath);
            const randomKey =
                this.termPolicyUtil.createRandomFilenameContentWithPath(
                    EnumTermPolicyType.termsOfService,
                    1,
                    EnumMessageLanguage.en,
                    {
                        extension: EnumFileExtensionTemplate.hbs,
                    }
                );

            return this.awsS3Service.putItem(
                {
                    file: templateContent,
                    key: randomKey,
                    size: templateContent.length,
                },
                {
                    forceUpdate: true,
                }
            );
        } catch (err: unknown) {
            this.logger.error(err);

            throw err;
        }
    }

    async importPrivacy(): Promise<AwsS3Dto> {
        try {
            const templatePath = join(
                this.templatesDir,
                'term-policy.privacy.en.hbs'
            );
            const templateContent = readFileSync(templatePath);
            const randomKey =
                this.termPolicyUtil.createRandomFilenameContentWithPath(
                    EnumTermPolicyType.privacy,
                    1,
                    EnumMessageLanguage.en,
                    {
                        extension: EnumFileExtensionTemplate.hbs,
                    }
                );

            return this.awsS3Service.putItem(
                {
                    file: templateContent,
                    key: randomKey,
                    size: templateContent.length,
                },
                {
                    forceUpdate: true,
                }
            );
        } catch (err: unknown) {
            this.logger.error(err);

            throw err;
        }
    }

    async importCookie(): Promise<AwsS3Dto> {
        try {
            const templatePath = join(
                this.templatesDir,
                'term-policy.cookies.en.hbs'
            );
            const templateContent = readFileSync(templatePath);
            const randomKey =
                this.termPolicyUtil.createRandomFilenameContentWithPath(
                    EnumTermPolicyType.cookies,
                    1,
                    EnumMessageLanguage.en,
                    {
                        extension: EnumFileExtensionTemplate.hbs,
                    }
                );

            return this.awsS3Service.putItem(
                {
                    file: templateContent,
                    key: randomKey,
                    size: templateContent.length,
                },
                {
                    forceUpdate: true,
                }
            );
        } catch (err: unknown) {
            this.logger.error(err);

            throw err;
        }
    }

    async importMarketing(): Promise<AwsS3Dto> {
        try {
            const templatePath = join(
                this.templatesDir,
                'term-policy.marketing.en.hbs'
            );
            const templateContent = readFileSync(templatePath);
            const randomKey =
                this.termPolicyUtil.createRandomFilenameContentWithPath(
                    EnumTermPolicyType.marketing,
                    1,
                    EnumMessageLanguage.en,
                    {
                        extension: EnumFileExtensionTemplate.hbs,
                    }
                );

            return this.awsS3Service.putItem(
                {
                    file: templateContent,
                    key: randomKey,
                    size: templateContent.length,
                },
                {
                    forceUpdate: true,
                }
            );
        } catch (err: unknown) {
            this.logger.error(err);

            throw err;
        }
    }
}
