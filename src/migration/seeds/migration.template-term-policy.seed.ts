import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    Prisma,
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
    name: 'templateTermPolicy',
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

            const policies = [
                {
                    type: EnumTermPolicyType.termsOfService,
                    asset: termsOfServiceAsset,
                },
                {
                    type: EnumTermPolicyType.privacy,
                    asset: privacyAsset,
                },
                {
                    type: EnumTermPolicyType.cookies,
                    asset: cookieAsset,
                },
                {
                    type: EnumTermPolicyType.marketing,
                    asset: marketingAsset,
                },
            ];

            await this.databaseService.withTransaction(
                async tx => {
                    for (const { type, asset } of policies) {
                        if (!asset) {
                            throw new Error(
                                `Template asset for ${type} could not be imported`
                            );
                        }

                        const { data: _data, ...content } = asset;
                        const contents: Prisma.TermPolicyContentCreateManyTermPolicyInput[] =
                            [
                                {
                                    language: EnumMessageLanguage.en,
                                    ...content,
                                },
                            ];

                        await tx.termPolicy.upsert({
                            where: {
                                type_version: {
                                    type,
                                    version: 1,
                                },
                            },
                            create: {
                                type,
                                version: 1,
                                status: EnumTermPolicyStatus.published,
                                contents: { createMany: { data: contents } },
                                createdBy: MigrationUserSuperAdminId,
                                updatedBy: MigrationUserSuperAdminId,
                            },
                            update: {
                                contents: {
                                    deleteMany: {},
                                    createMany: { data: contents },
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
