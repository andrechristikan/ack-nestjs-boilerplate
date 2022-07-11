import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/service/user.service';
import { UserBulkService } from 'src/user/service/user.bulk.service';
import { RoleService } from 'src/role/service/role.service';
import { AuthService } from 'src/auth/service/auth.service';
import { RoleDocument } from 'src/role/schema/role.schema';

@Injectable()
export class UserSeed {
    constructor(
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
                passwordExpired: password.passwordExpired,
                mobileNumber: '08111111111',
                role: role._id,
                salt: password.salt,
            });
        } catch (e) {
            throw new Error(e.message);
        }

        return;
    }

    @Command({
        command: 'remove:user',
        describe: 'remove users',
    })
    async remove(): Promise<void> {
        try {
            await this.userBulkService.deleteMany({});
        } catch (e) {
            throw new Error(e.message);
        }

        return;
    }
}
