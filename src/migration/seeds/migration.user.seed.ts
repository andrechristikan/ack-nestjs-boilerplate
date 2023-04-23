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
        const password = 'aaAA@@123444';
        const superadminRole: RoleDoc = await this.roleService.findOneByName(
            'superadmin'
        );
        const adminRole: RoleDoc = await this.roleService.findOneByName(
            'admin'
        );
        const memberRole: RoleDoc = await this.roleService.findOneByName(
            'member'
        );
        const userRole: RoleDoc = await this.roleService.findOneByName('user');
        const passwordHash = await this.authService.createPassword(
            'aaAA@@123444'
        );
        const user1: Promise<UserDoc> = this.userService.create(
            {
                firstName: 'superadmin',
                lastName: 'test',
                email: 'superadmin@mail.com',
                password,
                mobileNumber: '08111111222',
                signUpFrom: ENUM_USER_SIGN_UP_FROM.LOCAL,
                role: superadminRole._id,
            },
            passwordHash
        );
        const user2: Promise<UserDoc> = this.userService.create(
            {
                firstName: 'admin',
                lastName: 'test',
                email: 'admin@mail.com',
                password,
                signUpFrom: ENUM_USER_SIGN_UP_FROM.LOCAL,
                role: adminRole._id,
            },
            passwordHash
        );
        const user3: Promise<UserDoc> = this.userService.create(
            {
                firstName: 'user',
                lastName: 'test',
                email: 'user@mail.com',
                password,
                signUpFrom: ENUM_USER_SIGN_UP_FROM.LOCAL,
                role: userRole._id,
            },
            passwordHash
        );
        const user4: Promise<UserDoc> = this.userService.create(
            {
                firstName: 'member',
                lastName: 'test',
                email: 'member@mail.com',
                password,
                signUpFrom: ENUM_USER_SIGN_UP_FROM.LOCAL,
                role: memberRole._id,
            },
            passwordHash
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
