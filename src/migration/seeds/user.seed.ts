import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { AuthService } from 'src/common/auth/services/auth.service';
import { UserService } from 'src/modules/user/services/user.service';
import { UserBulkService } from 'src/modules/user/services/user.bulk.service';
import { RoleService } from 'src/modules/role/services/role.service';
import { RoleDocument } from 'src/modules/role/schemas/role.schema';

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
        const superadminRole: RoleDocument =
            await this.roleService.findOne<RoleDocument>({
                name: 'superadmin',
            });
        const adminRole: RoleDocument =
            await this.roleService.findOne<RoleDocument>({
                name: 'admin',
            });
        const userRole: RoleDocument =
            await this.roleService.findOne<RoleDocument>({
                name: 'user',
            });

        try {
            const password = await this.authService.createPassword(
                'aaAA@@123444'
            );

            await this.userService.create({
                firstName: 'superadmin',
                lastName: 'test',
                email: 'superadmin@mail.com',
                password: password.passwordHash,
                passwordExpired: password.passwordExpired,
                mobileNumber: '08111111222',
                role: superadminRole._id,
                salt: password.salt,
            });

            await this.userService.create({
                firstName: 'admin',
                lastName: 'test',
                email: 'admin@mail.com',
                password: password.passwordHash,
                passwordExpired: password.passwordExpired,
                mobileNumber: '08111111111',
                role: adminRole._id,
                salt: password.salt,
            });

            await this.userService.create({
                firstName: 'user',
                lastName: 'test',
                email: 'user@mail.com',
                password: password.passwordHash,
                passwordExpired: password.passwordExpired,
                mobileNumber: '08111111333',
                role: userRole._id,
                salt: password.salt,
            });
        } catch (err: any) {
            throw new Error(err.message);
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
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
