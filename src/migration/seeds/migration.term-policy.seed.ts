import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { migrationTermPolicyData } from '@migration/data/migration.term-policy.data';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENUM_TERM_POLICY_STATUS } from '@prisma/client';
import { Command } from 'nest-commander';

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

    private readonly env: ENUM_APP_ENVIRONMENT;
    private readonly termPolicies: TermPolicyCreateRequestDto[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
        private readonly databaseUtil: DatabaseUtil
    ) {
        super();

        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
        this.termPolicies = migrationTermPolicyData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding TermPolicies...');
        this.logger.log(
            `Found ${this.termPolicies.length} TermPolicies to seed.`
        );

        const existingTermPolicies =
            await this.databaseService.termPolicy.findMany({
                where: {
                    type: {
                        in: this.termPolicies.map(
                            termPolicy => termPolicy.type
                        ),
                    },
                },
                select: {
                    id: true,
                },
            });
        if (existingTermPolicies.length > 0) {
            this.logger.warn('TermPolicies already exist, skipping seed.');
            return;
        }

        await this.databaseService.termPolicy.createMany({
            data: this.termPolicies.map(termPolicy => ({
                ...termPolicy,
                contents: this.databaseUtil.toPlainArray(termPolicy.contents),
                status: ENUM_TERM_POLICY_STATUS.published,
            })),
        });

        this.logger.log('TermPolicies seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back TermPolicies...');
        this.logger.log(
            `Found ${this.termPolicies.length} TermPolicies to remove.`
        );

        await this.databaseService.termPolicy.deleteMany({
            where: {
                type: {
                    in: this.termPolicies.map(termPolicy => termPolicy.type),
                },
            },
        });

        this.logger.log('TermPolicies removed successfully.');

        return;
    }
}
