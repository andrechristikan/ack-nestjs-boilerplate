import { DatabaseService } from '@common/database/services/database.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { TermPolicyTemplateService } from '@modules/term-policy/services/term-policy.template.service';
import { Logger } from '@nestjs/common';
import { EnumTermPolicyStatus, EnumTermPolicyType } from '@prisma/client';
import { Command } from 'nest-commander';

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
        private readonly databaseService: DatabaseService
    ) {
        super();
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Term Policies...');

        const [termsOfServiceKey, privacyKey, cookieKey, marketingKey] =
            await Promise.all([
                this.termPolicyTemplateService.importTermsOfService(),
                this.termPolicyTemplateService.importPrivacy(),
                this.termPolicyTemplateService.importCookie(),
                this.termPolicyTemplateService.importMarketing(),
            ]);

        await this.databaseService.$transaction([
            this.databaseService.termPolicy.upsert({
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
                    contents: [
                        {
                            key: termsOfServiceKey.key,
                            language: EnumMessageLanguage.en,
                            size: termsOfServiceKey.size,
                        },
                    ],
                },
                update: {
                    contents: [
                        {
                            key: termsOfServiceKey.key,
                            language: EnumMessageLanguage.en,
                            size: termsOfServiceKey.size,
                        },
                    ],
                },
            }),
            this.databaseService.termPolicy.upsert({
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
                    contents: [
                        {
                            key: privacyKey.key,
                            language: EnumMessageLanguage.en,
                            size: privacyKey.size,
                        },
                    ],
                },
                update: {
                    contents: [
                        {
                            key: privacyKey.key,
                            language: EnumMessageLanguage.en,
                            size: privacyKey.size,
                        },
                    ],
                },
            }),
            this.databaseService.termPolicy.upsert({
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
                    contents: [
                        {
                            key: cookieKey.key,
                            language: EnumMessageLanguage.en,
                            size: cookieKey.size,
                        },
                    ],
                },
                update: {
                    contents: [
                        {
                            key: cookieKey.key,
                            language: EnumMessageLanguage.en,
                            size: cookieKey.size,
                        },
                    ],
                },
            }),
            this.databaseService.termPolicy.upsert({
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
                    contents: [
                        {
                            key: marketingKey.key,
                            language: EnumMessageLanguage.en,
                            size: marketingKey.size,
                        },
                    ],
                },
                update: {
                    contents: [
                        {
                            key: marketingKey.key,
                            language: EnumMessageLanguage.en,
                            size: marketingKey.size,
                        },
                    ],
                },
            }),
        ]);

        this.logger.log('Term Policies seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Term Policies...');

        await Promise.all([]);

        this.logger.log('Term Policies removed successfully.');

        return;
    }
}
