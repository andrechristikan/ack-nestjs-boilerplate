import { DatabaseService } from '@common/database/services/database.service';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { TermPolicyTemplateService } from '@modules/term-policy/services/term-policy.template.service';
import { Logger } from '@nestjs/common';
import { ENUM_TERM_POLICY_STATUS, ENUM_TERM_POLICY_TYPE } from '@prisma/client';
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
                        type: ENUM_TERM_POLICY_TYPE.termsOfService,
                        version: 1,
                    },
                },
                create: {
                    type: ENUM_TERM_POLICY_TYPE.termsOfService,
                    version: 1,
                    status: ENUM_TERM_POLICY_STATUS.published,
                    contents: [
                        {
                            key: termsOfServiceKey.key,
                            language: ENUM_MESSAGE_LANGUAGE.EN,
                            size: termsOfServiceKey.size,
                        },
                    ],
                },
                update: {
                    contents: [
                        {
                            key: termsOfServiceKey.key,
                            language: ENUM_MESSAGE_LANGUAGE.EN,
                            size: termsOfServiceKey.size,
                        },
                    ],
                },
            }),
            this.databaseService.termPolicy.upsert({
                where: {
                    type_version: {
                        type: ENUM_TERM_POLICY_TYPE.privacy,
                        version: 1,
                    },
                },
                create: {
                    type: ENUM_TERM_POLICY_TYPE.privacy,
                    version: 1,
                    status: ENUM_TERM_POLICY_STATUS.published,
                    contents: [
                        {
                            key: privacyKey.key,
                            language: ENUM_MESSAGE_LANGUAGE.EN,
                            size: privacyKey.size,
                        },
                    ],
                },
                update: {
                    contents: [
                        {
                            key: privacyKey.key,
                            language: ENUM_MESSAGE_LANGUAGE.EN,
                            size: privacyKey.size,
                        },
                    ],
                },
            }),
            this.databaseService.termPolicy.upsert({
                where: {
                    type_version: {
                        type: ENUM_TERM_POLICY_TYPE.cookie,
                        version: 1,
                    },
                },
                create: {
                    type: ENUM_TERM_POLICY_TYPE.cookie,
                    version: 1,
                    status: ENUM_TERM_POLICY_STATUS.published,
                    contents: [
                        {
                            key: cookieKey.key,
                            language: ENUM_MESSAGE_LANGUAGE.EN,
                            size: cookieKey.size,
                        },
                    ],
                },
                update: {
                    contents: [
                        {
                            key: cookieKey.key,
                            language: ENUM_MESSAGE_LANGUAGE.EN,
                            size: cookieKey.size,
                        },
                    ],
                },
            }),
            this.databaseService.termPolicy.upsert({
                where: {
                    type_version: {
                        type: ENUM_TERM_POLICY_TYPE.marketing,
                        version: 1,
                    },
                },
                create: {
                    type: ENUM_TERM_POLICY_TYPE.marketing,
                    version: 1,
                    status: ENUM_TERM_POLICY_STATUS.published,
                    contents: [
                        {
                            key: marketingKey.key,
                            language: ENUM_MESSAGE_LANGUAGE.EN,
                            size: marketingKey.size,
                        },
                    ],
                },
                update: {
                    contents: [
                        {
                            key: marketingKey.key,
                            language: ENUM_MESSAGE_LANGUAGE.EN,
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
