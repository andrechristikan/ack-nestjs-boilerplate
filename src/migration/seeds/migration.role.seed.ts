import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
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

    private readonly env: ENUM_APP_ENVIRONMENT;
    private readonly roles: RoleCreateRequestDto[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
        private readonly databaseUtil: DatabaseUtil
    ) {
        super();

        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
        this.roles = migrationRoleData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Roles...');
        this.logger.log(`Found ${this.roles.length} Roles to seed.`);

        const existingRoles = await this.databaseService.role.findMany({
            where: {
                name: {
                    in: this.roles.map(role => role.name),
                },
            },
            select: {
                id: true,
            },
        });
        if (existingRoles.length > 0) {
            this.logger.warn('Roles already exist, skipping seed.');
            return;
        }

        await this.databaseService.role.createMany({
            data: this.roles.map(role => ({
                ...role,
                abilities: this.databaseUtil.toPlainArray(role.abilities),
            })),
        });

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
