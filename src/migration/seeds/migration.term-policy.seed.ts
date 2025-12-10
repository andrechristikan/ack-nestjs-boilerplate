import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { migrationTermPolicyData } from '@migration/data/migration.term-policy.data';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnumTermPolicyStatus } from '@prisma/client';
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

    private readonly env: EnumAppEnvironment;
    private readonly termPolicies: TermPolicyCreateRequestDto[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
        private readonly databaseUtil: DatabaseUtil
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env');
        this.termPolicies = migrationTermPolicyData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding TermPolicies...');
        this.logger.log(
            `Found ${this.termPolicies.length} TermPolicies to seed.`
        );

        await this.databaseService.$transaction(
            this.termPolicies.map(termPolicy =>
                this.databaseService.termPolicy.upsert({
                    where: {
                        type_version: {
                            type: termPolicy.type,
                            version: termPolicy.version,
                        },
                    },
                    create: {
                        ...termPolicy,
                        contents: this.databaseUtil.toPlainArray(
                            termPolicy.contents
                        ),
                        status: EnumTermPolicyStatus.published,
                    },
                    update: {},
                })
            )
        );

        this.logger.log('TermPolicies seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back TermPolicies...');

        await this.databaseService.termPolicy.deleteMany({});

        this.logger.log('TermPolicies removed successfully.');

        return;
    }
}
