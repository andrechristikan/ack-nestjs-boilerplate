import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';

import { RoleService } from 'src/role/role.service';
import { UserBulkService, UserService } from 'src/user/user.service';
import { AuthService } from 'src/auth/auth.service';
import { RoleDocument } from 'src/role/role.schema';

@Injectable()
export class UserSeed {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly userBulkService: UserBulkService,
        private readonly roleService: RoleService
    ) {}

    @Command({
        command: 'insert:user',
        describe: 'insert users',
    })
    async insert(): Promise<void> {
        const role: RoleDocument = await this.roleService.findOne<RoleDocument>(
            {
                name: 'admin',
            }
        );

        try {
            const password = await this.authService.createPassword(
                'aaAA@@123444'
            );

            await this.userService.create({
                firstName: 'admin',
                lastName: 'test',
                email: 'admin@mail.com',
                password: password.passwordHash,
                passwordExpiredDate: password.passwordExpiredDate,
                mobileNumber: '08111111111',
                role: role._id,
                salt: password.salt,
            });

            this.debuggerService.info('Insert User Succeed', {
                class: 'UserSeed',
                function: 'insert',
            });
        } catch (e) {
            this.debuggerService.error(e.message, {
                class: 'UserSeed',
                function: 'insert',
            });
        }
    }

    @Command({
        command: 'remove:user',
        describe: 'remove users',
    })
    async remove(): Promise<void> {
        try {
            await this.userBulkService.deleteMany({});

            this.debuggerService.info('Remove User Succeed', {
                class: 'UserSeed',
                function: 'remove',
            });
        } catch (e) {
            this.debuggerService.error(e.message, {
                class: 'UserSeed',
                function: 'remove',
            });
        }
    }
}
