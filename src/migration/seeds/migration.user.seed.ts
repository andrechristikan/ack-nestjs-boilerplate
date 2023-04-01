import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { AuthService } from 'src/common/auth/services/auth.service';
import { UserService } from 'src/modules/user/services/user.service';
import { RoleService } from 'src/modules/role/services/role.service';
import {
    RoleDoc,
    RoleEntity,
} from 'src/modules/role/repository/entities/role.entity';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';

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
        const userRole: RoleDoc = await this.roleService.findOneByName('user');
        const passwordHash = await this.authService.createPassword(
            'aaAA@@123444'
        );
        const user1: Promise<UserDoc> = this.userService.create(
            {
                username: 'superadmin',
                firstName: 'superadmin',
                lastName: 'test',
                email: 'superadmin@mail.com',
                password,
                mobileNumber: '08111111222',
                role: superadminRole._id,
            },
            passwordHash
        );
        const user2: Promise<UserDoc> = this.userService.create(
            {
                username: 'admin',
                firstName: 'admin',
                lastName: 'test',
                email: 'admin@mail.com',
                password,
                mobileNumber: '08111111111',
                role: adminRole._id,
            },
            passwordHash
        );
        const user3: Promise<UserDoc> = this.userService.create(
            {
                username: 'user',
                firstName: 'user',
                lastName: 'test',
                email: 'user@mail.com',
                password,
                mobileNumber: '08111111333',
                role: userRole._id,
            },
            passwordHash
        );

        try {
            await Promise.all([user1, user2, user3]);
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
