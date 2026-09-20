import type { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { MigrationUserSuperAdminId } from '@migration/data/migration.user.data';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { TermPolicyTemplateDomain } from '@modules/term-policy/domains/term-policy.template.domain';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private readonly seedTransactionTimeoutInMs: number;

    constructor(
        private readonly termPolicyTemplateDomain: TermPolicyTemplateDomain,
        private readonly databaseService: DatabaseService,
        private readonly awsS3Service: AwsS3Service,
        private readonly configService: ConfigService
    ) {
        super();

        this.seedTransactionTimeoutInMs = this.configService.get<number>(
            'database.seedTransactionTimeoutInMs'
        )!;
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
                this.termPolicyTemplateDomain.importTermsOfService(),
                this.termPolicyTemplateDomain.importPrivacy(),
                this.termPolicyTemplateDomain.importCookie(),
                this.termPolicyTemplateDomain.importMarketing(),
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

            const policies = [
                {
                    type: EnumTermPolicyType.termsOfService,
                    content: this.mapContent(termsOfServiceAsset),
                },
                {
                    type: EnumTermPolicyType.privacy,
                    content: this.mapContent(privacyAsset),
                },
                {
                    type: EnumTermPolicyType.cookies,
                    content: this.mapContent(cookieAsset),
                },
                {
                    type: EnumTermPolicyType.marketing,
                    content: this.mapContent(marketingAsset),
                },
            ];

            await this.databaseService.withTransaction(
                async tx => {
                    for (const { type, content } of policies) {
                        await tx.termPolicy.upsert({
                            where: {
                                type_version: { type, version: 1 },
                            },
                            create: {
                                type,
                                version: 1,
                                status: EnumTermPolicyStatus.published,
                                contents: { create: content },
                                createdBy: MigrationUserSuperAdminId,
                                updatedBy: MigrationUserSuperAdminId,
                            },
                            update: {
                                contents: {
                                    deleteMany: {},
                                    create: content,
                                },
                                updatedBy: MigrationUserSuperAdminId,
                            },
                        });
                    }
                },
                { timeout: this.seedTransactionTimeoutInMs }
            );
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
