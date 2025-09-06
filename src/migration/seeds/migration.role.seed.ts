import { Command } from 'nestjs-command';
import { Injectable, Logger } from '@nestjs/common';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { RoleUtil } from '@modules/role/utils/role.util';

@Injectable()
export class MigrationRoleSeed {
    private readonly logger = new Logger(MigrationRoleSeed.name);

    private readonly roles: RoleCreateRequestDto[] = [
        {
            name: 'superadmin',
            description: 'Super Admin Role',
            abilities: [],
            type: ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN,
        },
        {
            name: 'admin',
            description: 'Admin Role',
            abilities: Object.values(ENUM_POLICY_SUBJECT).map(role => ({
                subject: role,
                action: Object.values(ENUM_POLICY_ACTION),
            })),
            type: ENUM_POLICY_ROLE_TYPE.ADMIN,
        },
        {
            name: 'user',
            description: 'User Role',
            abilities: [],
            type: ENUM_POLICY_ROLE_TYPE.USER,
        },
    ];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly roleUtil: RoleUtil
    ) {}

    @Command({
        command: 'seed:role',
        describe: 'seeds roles',
    })
    async seeds(): Promise<void> {
        this.logger.log('Seeding Roles...');

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
            this.logger.log('Roles already exist, skipping seed.');
            return;
        }

        await this.databaseService.role.createMany({
            data: this.roles.map(role =>
                this.roleUtil.serializeCreateDto(role)
            ),
        });

        this.logger.log('Roles seeded successfully.');

        return;
    }

    @Command({
        command: 'remove:role',
        describe: 'remove roles',
    })
    async remove(): Promise<void> {
        this.logger.log('Removing Roles...');

        await this.databaseService.role.deleteMany({
            where: {
                name: {
                    in: this.roles.map(role =>
                        this.roleUtil.serializeName(role.name)
                    ),
                },
            },
        });

        this.logger.log('Roles removed successfully.');

        return;
    }
}
