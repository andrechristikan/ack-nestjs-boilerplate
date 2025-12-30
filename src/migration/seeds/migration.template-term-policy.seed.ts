import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil
    ) {
        super();
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Term Policies...');

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
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...termsOfServiceAsset,
                            },
                        ]),
                    },
                    update: {
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...termsOfServiceAsset,
                            },
                        ]),
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
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...privacyAsset,
                            },
                        ]),
                    },
                    update: {
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...privacyAsset,
                            },
                        ]),
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
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...cookieAsset,
                            },
                        ]),
                    },
                    update: {
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...cookieAsset,
                            },
                        ]),
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
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...marketingAsset,
                            },
                        ]),
                    },
                    update: {
                        contents: this.databaseUtil.toPlainArray([
                            {
                                language: EnumMessageLanguage.en,
                                ...marketingAsset,
                            },
                        ]),
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
