import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';

import { RoleService } from 'src/role/role.service';
import { UserService } from 'src/user/user.service';
import { Hash } from 'src/hash/hash.decorator';
import { HashService } from 'src/hash/hash.service';

@Injectable()
export class UserSeed {
    constructor(
        @Logger() private readonly logger: LoggerService,
        private readonly userService: UserService,
        private readonly roleService: RoleService,
        @Hash() readonly hashService: HashService
    ) {}

    @Command({
        command: 'create:user',
        describe: 'insert users',
        autoExit: true
    })
    async create(): Promise<void> {
        const role = await this.roleService.findAll(0, 1, {
            name: 'admin'
        });

        if (!role || role.length === 0) {
            this.logger.error('Go Insert User Before Insert Roles', {
                class: 'UserSeed',
                function: 'create'
            });

            return;
        }

        const check = await this.userService.findAll(0, 1, {
            email: 'admin@mail.com'
        });
        if (check && check.length !== 0) {
            this.logger.error('Only for initial purpose', {
                class: 'UserSeed',
                function: 'create'
            });

            return;
        }

        try {
            await this.userService.create({
                firstName: 'admin',
                lastName: 'test',
                email: 'admin@mail.com',
                password: '123456',
                mobileNumber: '08111111111',
                role: role[0]._id
            });

            this.logger.info('Insert User Succeed', {
                class: 'UserSeed',
                function: 'create'
            });
        } catch (e) {
            this.logger.error(e.message, {
                class: 'UserSeed',
                function: 'create'
            });
        }
    }

    @Command({
        command: 'remove:user',
        describe: 'remove users',
        autoExit: true
    })
    async remove(): Promise<void> {
        try {
            await this.userService.deleteMany({
                email: 'admin@mail.com'
            });

            this.logger.info('Remove User Succeed', {
                class: 'UserSeed',
                function: 'remove'
            });
        } catch (e) {
            this.logger.error(e.message, {
                class: 'UserSeed',
                function: 'remove'
            });
        }
    }
}
