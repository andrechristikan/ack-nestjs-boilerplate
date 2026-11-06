import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { MigrationTermPolicyData } from '@migration/data/migration.term-policy.data';
import { MigrationUserSuperAdminId } from '@migration/data/migration.user.data';
import type { IMigrationTermPolicyData } from '@migration/interfaces/migration.interface';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import type { ITermPolicyContent } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { Command } from 'nest-commander';
import { join } from 'path';

/**
 * Seeds version 1 of every term policy type, published with its bundled `en` template. Uploads the template to S3 when configured and stores the row either way.
 */
@Command({
    name: 'termPolicy',
    description: 'Seed/Remove Term Policies',
    allowUnknownOptions: false,
})
export class MigrationTermPolicySeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationTermPolicySeed.name);

    private readonly env: EnumAppEnvironment;
    private readonly termPolicies: IMigrationTermPolicyData[] = [];
    private readonly seedTransactionTimeoutInMs: number;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly awsS3Service: AwsS3Service,
        private readonly termPolicyUtil: TermPolicyUtil,
        private readonly helperDateService: HelperDateService
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.termPolicies = MigrationTermPolicyData[this.env];
        this.seedTransactionTimeoutInMs = this.configService.get<number>(
            'database.seedTransactionTimeoutInMs'
        )!;
    }

    private readTemplate(type: EnumTermPolicyType): Buffer {
        const templateDir = join(
            import.meta.dirname,
            '../../modules/term-policy/templates'
        );

        switch (type) {
            case EnumTermPolicyType.termsOfService:
                return readFileSync(
                    join(templateDir, 'term-policy.term.en.hbs')
                );
            case EnumTermPolicyType.privacy:
                return readFileSync(
                    join(templateDir, 'term-policy.privacy.en.hbs')
                );
            case EnumTermPolicyType.cookies:
                return readFileSync(
                    join(templateDir, 'term-policy.cookies.en.hbs')
                );
            case EnumTermPolicyType.marketing:
                return readFileSync(
                    join(templateDir, 'term-policy.marketing.en.hbs')
                );
        }
    }

    private async buildContent({
        type,
        version,
    }: IMigrationTermPolicyData): Promise<ITermPolicyContent> {
        const file = this.readTemplate(type);
        const key = this.termPolicyUtil.createRandomFilenameContentWithPath(
            type,
            version,
            EnumMessageLanguage.en,
            { extension: EnumFileExtensionTemplate.hbs }
        );

        const isS3Initialized = this.awsS3Service.isInitialized();
        if (!isS3Initialized) {
            const presign = this.awsS3Service.mapPresign(
                { key, size: file.length },
                { access: EnumAwsS3Accessibility.public }
            );

            return { language: EnumMessageLanguage.en, ...presign };
        }

        const privateItem = await this.awsS3Service.putItem(
            { file, key, size: file.length },
            { forceUpdate: true, access: EnumAwsS3Accessibility.private }
        );
        if (!privateItem) {
            throw new AppUnknownException(
                null,
                `Uploading the ${type} term policy template failed`
            );
        }

        const publicPath = this.termPolicyUtil.getContentPublicPath(
            type,
            version
        );
        const publicItem = await this.awsS3Service.copyItem(
            privateItem,
            publicPath,
            {
                accessFrom: EnumAwsS3Accessibility.private,
                accessTo: EnumAwsS3Accessibility.public,
            }
        );
        if (!publicItem) {
            throw new AppUnknownException(
                null,
                `Copying the ${type} term policy template failed`
            );
        }

        return { language: EnumMessageLanguage.en, ...publicItem };
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding TermPolicies...');
        this.logger.log(
            `Found ${this.termPolicies.length} TermPolicies to seed.`
        );

        const isS3Initialized = this.awsS3Service.isInitialized();
        if (!isS3Initialized) {
            this.logger.warn(
                'AWS S3 is not configured. Seeding term policies without uploading their content.'
            );
        }

        try {
            const keys = this.termPolicies.map(({ type, version }) => ({
                type,
                version,
            }));
            const existing =
                await this.databaseService.client.termPolicy.findMany({
                    where: {
                        OR: keys,
                    },
                    select: { type: true, version: true },
                });
            const missing = this.termPolicies.filter(
                termPolicy =>
                    !existing.some(
                        row =>
                            row.type === termPolicy.type &&
                            row.version === termPolicy.version
                    )
            );

            const rows = await Promise.all(
                missing.map(async termPolicy => {
                    const content = await this.buildContent(termPolicy);
                    const contents: Prisma.TermPolicyContentCreateInput[] =
                        this.databaseUtil.toPlainArray([content]);

                    return { ...termPolicy, contents };
                })
            );
            const publishedAt = this.helperDateService.create();

            await this.databaseService.withTransaction(
                async tx => {
                    for (const { type, version, contents } of rows) {
                        await tx.termPolicy.upsert({
                            where: { type_version: { type, version } },
                            create: {
                                type,
                                version,
                                contents,
                                status: EnumTermPolicyStatus.published,
                                publishedAt,
                                createdBy: MigrationUserSuperAdminId,
                                updatedBy: MigrationUserSuperAdminId,
                            },
                            update: {
                                updatedBy: MigrationUserSuperAdminId,
                            },
                        });
                    }
                },
                { timeout: this.seedTransactionTimeoutInMs }
            );

            const published =
                await this.databaseService.client.termPolicy.findMany({
                    where: {
                        type: { in: TermPolicyDefaultRequiredTypes },
                        status: EnumTermPolicyStatus.published,
                    },
                    select: { type: true },
                });
            const publishedTypes = new Set(published.map(row => row.type));
            const unpublished = TermPolicyDefaultRequiredTypes.filter(
                type => !publishedTypes.has(type)
            );
            if (unpublished.length > 0) {
                throw new AppUnknownException(
                    null,
                    `Required term policies not published: ${unpublished.join(', ')}`
                );
            }
        } catch (error: unknown) {
            if (error instanceof AppUnknownException) {
                throw error;
            }

            throw new AppUnknownException(
                error,
                'Seeding term policies failed'
            );
        }

        this.logger.log('TermPolicies seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back TermPolicies...');

        try {
            await this.databaseService.withTransaction(
                async tx => {
                    await tx.termPolicyUserAcceptance.deleteMany({});
                    await tx.termPolicyRecipient.deleteMany({});
                    await tx.termPolicy.deleteMany({});
                },
                { timeout: this.seedTransactionTimeoutInMs }
            );
        } catch (error: unknown) {
            throw new AppUnknownException(
                error,
                'Removing term policies failed'
            );
        }

        this.logger.log('TermPolicies removed successfully.');

        return;
    }
}
