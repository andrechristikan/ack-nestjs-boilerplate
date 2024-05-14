import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { AuthService } from 'src/common/auth/services/auth.service';
import { UserService } from 'src/modules/user/services/user.service';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { RoleDoc } from 'src/modules/role/repository/entities/role.entity';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_USER_SIGN_UP_FROM } from 'src/modules/user/constants/user.enum.constant';

@Injectable()
export class MigrationUserSeed {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly roleService: RoleService
    ) {}

    @Command({
        command: 'seed:user',
        describe: 'seed users',
    })
    async seeds(): Promise<void> {
        const password = 'aaAA@123';
        const passwordHash = await this.authService.createPassword(password);
        const superAdminRole: RoleDoc =
            await this.roleService.findOneByName('superadmin');
        const adminRole: RoleDoc =
            await this.roleService.findOneByName('admin');
        const memberRole: RoleDoc =
            await this.roleService.findOneByName('member');
        const userRole: RoleDoc = await this.roleService.findOneByName('user');
        const user1: Promise<UserDoc> = this.userService.create(
            {
                role: superAdminRole._id,
                firstName: 'superadmin',
                lastName: 'test',
                email: 'superadmin@mail.com',
                password,
            },
            passwordHash,
            ENUM_USER_SIGN_UP_FROM.ADMIN
        );
        const user2: Promise<UserDoc> = this.userService.create(
            {
                role: adminRole._id,
                firstName: 'admin',
                lastName: 'test',
                email: 'admin@mail.com',
                password,
            },
            passwordHash,
            ENUM_USER_SIGN_UP_FROM.ADMIN
        );
        const user3: Promise<UserDoc> = this.userService.create(
            {
                role: userRole._id,
                firstName: 'user',
                lastName: 'test',
                email: 'user@mail.com',
                password,
            },
            passwordHash,
            ENUM_USER_SIGN_UP_FROM.ADMIN
        );
        const user4: Promise<UserDoc> = this.userService.create(
            {
                role: memberRole._id,
                firstName: 'member',
                lastName: 'test',
                email: 'member@mail.com',
                password,
            },
            passwordHash,
            ENUM_USER_SIGN_UP_FROM.ADMIN
        );

        try {
            await Promise.all([user1, user2, user3, user4]);
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
            await this.userService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
