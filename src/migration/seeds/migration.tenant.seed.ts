import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { migrationTenantData } from '@migration/data/migration.tenant.data';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { TenantCreateRequestDto } from '@modules/tenant/dtos/request/tenant.create.request.dto';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnumTenantStatus } from '@prisma/client';
import { Command } from 'nest-commander';

@Command({
    name: 'tenant',
    description: 'Seed/Remove Tenants',
    allowUnknownOptions: false,
})
export class MigrationTenantSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationTenantSeed.name);

    private readonly env: EnumAppEnvironment;
    private readonly tenants: TenantCreateRequestDto[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env');
        this.tenants = migrationTenantData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Tenants...');
        this.logger.log(`Found ${this.tenants.length} Tenants to seed.`);

        try {
            for (const tenant of this.tenants) {
                const existingTenant =
                    await this.databaseService.tenant.findFirst({
                        where: {
                            name: tenant.name,
                        },
                    });

                if (!existingTenant) {
                    await this.databaseService.tenant.create({
                        data: {
                            name: tenant.name,
                            status: EnumTenantStatus.active,
                        },
                    });
                    this.logger.log(`Created tenant: ${tenant.name}`);
                } else {
                    this.logger.log(
                        `Tenant already exists: ${tenant.name}, skipping...`
                    );
                }
            }
        } catch (error: unknown) {
            this.logger.error(error, 'Error seeding tenants');
            throw error;
        }

        this.logger.log('Tenants seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Tenants...');

        try {
            await this.databaseService.$transaction([
                this.databaseService.tenantMember.deleteMany({}),
                this.databaseService.tenant.deleteMany({}),
            ]);
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing tenants');
            throw error;
        }

        this.logger.log('Tenants removed successfully.');

        return;
    }
}
