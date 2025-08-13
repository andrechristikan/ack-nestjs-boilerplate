import { Command } from 'nestjs-command';
import { Injectable, Logger } from '@nestjs/common';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import { RoleRepository } from '@modules/role/repository/repositories/role.repository';

@Injectable()
export class MigrationRoleSeed {
    private readonly logger = new Logger(MigrationRoleSeed.name);

    private readonly roles: RoleCreateRequestDto[] = [
        {
            name: 'superadmin',
            description: 'Super Admin Role',
            permissions: [],
            type: ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN,
        },
        {
            name: 'admin',
            description: 'Admin Role',
            permissions: Object.values(ENUM_POLICY_SUBJECT).map(role => ({
                subject: role,
                action: Object.values(ENUM_POLICY_ACTION),
            })),
            type: ENUM_POLICY_ROLE_TYPE.ADMIN,
        },
        {
            name: 'user',
            description: 'User Role',
            permissions: [],
            type: ENUM_POLICY_ROLE_TYPE.USER,
        },
    ];

    constructor(private readonly roleRepository: RoleRepository) {}

    @Command({
        command: 'seed:role',
        describe: 'seeds roles',
    })
    async seeds(): Promise<void> {
        this.logger.log('Seeding Roles...');

        const existingRoles = await this.roleRepository.findMany({
            where: {
                name: {
                    in: this.roles.map(role => role.name),
                },
            },
            select: {
                _id: true,
            },
            withDeleted: true,
        });
        if (existingRoles.length > 0) {
            this.logger.log('Roles already exist, skipping seed.');
            return;
        }

        await this.roleRepository.createMany({
            data: this.roles,
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

        await this.roleRepository.deleteMany({
            where: {
                name: {
                    in: this.roles.map(role => role.name),
                },
            },
            withDeleted: true,
        });

        this.logger.log('Roles removed successfully.');

        return;
    }
}
