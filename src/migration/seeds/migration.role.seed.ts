import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { migrationRoleData } from '@migration/data/migration.role.data';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';

@Command({
    name: 'role',
    description: 'Seed/Remove Roles',
    allowUnknownOptions: false,
})
export class MigrationRoleSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationRoleSeed.name);

    private readonly env: EnumAppEnvironment;
    private readonly roles: RoleCreateRequestDto[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
        private readonly databaseUtil: DatabaseUtil
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env');
        this.roles = migrationRoleData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Roles...');
        this.logger.log(`Found ${this.roles.length} Roles to seed.`);

        await this.databaseService.$transaction(
            this.roles.map(role =>
                this.databaseService.role.upsert({
                    where: {
                        name: role.name.toLowerCase(),
                    },
                    create: {
                        ...role,
                        name: role.name.toLowerCase(),
                        abilities: this.databaseUtil.toPlainArray(
                            role.abilities
                        ),
                    },
                    update: {},
                })
            )
        );

        this.logger.log('Roles seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Roles...');

        await this.databaseService.role.deleteMany({});

        this.logger.log('Roles removed successfully.');

        return;
    }
}
