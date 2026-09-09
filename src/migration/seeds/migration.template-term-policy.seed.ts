import { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { TermPolicyTemplateService } from '@modules/term-policy/services/term-policy.template.service';
import { Logger } from '@nestjs/common';
import { Command } from 'nest-commander';

/**
 * Uploads term policy documents to S3 and writes their published records; removal is a no-op. Throws if S3 is uninitialized.
 */
@Command({
    name: 'template-termPolicy',
    description: 'Seed/Remove Term Policies',
    allowUnknownOptions: false,
})
export class MigrationTemplateTermPolicySeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationTemplateTermPolicySeed.name);

    constructor(
        private readonly termPolicyTemplateService: TermPolicyTemplateService,
        private readonly databaseService: DatabaseService,
        private readonly awsS3Service: AwsS3Service
    ) {
        super();
    }

    private mapContent(asset: IAwsS3): Omit<IAwsS3, 'data'> & {
        language: EnumMessageLanguage;
    } {
        return {
            language: EnumMessageLanguage.en,
            bucket: asset.bucket,
            key: asset.key,
            cdnUrl: asset.cdnUrl,
            completedUrl: asset.completedUrl,
            mime: asset.mime,
            extension: asset.extension,
            access: asset.access,
            size: asset.size,
        };
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Term Policies...');

        const isS3Initialized = this.awsS3Service.isInitialized();
        if (!isS3Initialized) {
            this.logger.error(
                'AWS S3 is not initialized. Cannot seed term policies.'
            );

            throw new Error('AWS S3 is not initialized');
        }

        try {
            const [
                termsOfServiceAsset,
                privacyAsset,
                cookieAsset,
                marketingAsset,
            ] = await Promise.all([
                this.termPolicyTemplateService.importTermsOfService(),
                this.termPolicyTemplateService.importPrivacy(),
                this.termPolicyTemplateService.importCookie(),
                this.termPolicyTemplateService.importMarketing(),
            ]);
            if (
                !termsOfServiceAsset ||
                !privacyAsset ||
                !cookieAsset ||
                !marketingAsset
            ) {
                this.logger.error('Term policy template asset is missing.');
                return;
            }

            const termsOfServiceContent =
                this.mapContent(termsOfServiceAsset);
            const privacyContent = this.mapContent(privacyAsset);
            const cookieContent = this.mapContent(cookieAsset);
            const marketingContent = this.mapContent(marketingAsset);

            await this.databaseService.client.$transaction([
                this.databaseService.client.termPolicy.upsert({
                    where: {
                        type_version: {
                            type: EnumTermPolicyType.termsOfService,
                            version: 1,
                        },
                    },
                    create: {
                        type: EnumTermPolicyType.termsOfService,
                        version: 1,
                        status: EnumTermPolicyStatus.published,
                        contents: {
                            create: termsOfServiceContent,
                        },
                    },
                    update: {
                        contents: {
                            deleteMany: {},
                            create: termsOfServiceContent,
                        },
                    },
                }),
                this.databaseService.client.termPolicy.upsert({
                    where: {
                        type_version: {
                            type: EnumTermPolicyType.privacy,
                            version: 1,
                        },
                    },
                    create: {
                        type: EnumTermPolicyType.privacy,
                        version: 1,
                        status: EnumTermPolicyStatus.published,
                        contents: {
                            create: privacyContent,
                        },
                    },
                    update: {
                        contents: {
                            deleteMany: {},
                            create: privacyContent,
                        },
                    },
                }),
                this.databaseService.client.termPolicy.upsert({
                    where: {
                        type_version: {
                            type: EnumTermPolicyType.cookies,
                            version: 1,
                        },
                    },
                    create: {
                        type: EnumTermPolicyType.cookies,
                        version: 1,
                        status: EnumTermPolicyStatus.published,
                        contents: {
                            create: cookieContent,
                        },
                    },
                    update: {
                        contents: {
                            deleteMany: {},
                            create: cookieContent,
                        },
                    },
                }),
                this.databaseService.client.termPolicy.upsert({
                    where: {
                        type_version: {
                            type: EnumTermPolicyType.marketing,
                            version: 1,
                        },
                    },
                    create: {
                        type: EnumTermPolicyType.marketing,
                        version: 1,
                        status: EnumTermPolicyStatus.published,
                        contents: {
                            create: marketingContent,
                        },
                    },
                    update: {
                        contents: {
                            deleteMany: {},
                            create: marketingContent,
                        },
                    },
                }),
            ]);
        } catch (error: unknown) {
            this.logger.error(error, 'Error seeding term policies');
            throw error;
        }

        this.logger.log('Term Policies seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Skipping removal of Term Policies seed.');

        return;
    }
}
