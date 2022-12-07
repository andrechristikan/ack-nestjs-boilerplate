import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { AuthService } from 'src/common/auth/services/auth.service';
import { UserService } from 'src/modules/user/services/user.service';
import { UserBulkService } from 'src/modules/user/services/user.bulk.service';
import { RoleService } from 'src/modules/role/services/role.service';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';

@Injectable()
export class UserSeed {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly userBulkService: UserBulkService,
        private readonly roleService: RoleService
    ) {}

    @Command({
        command: 'seed:user',
        describe: 'seed users',
    })
    async seeds(): Promise<void> {
        const password = 'aaAA@@123444';
        const superadminRole: RoleEntity =
            await this.roleService.findOne<RoleEntity>({
                name: 'superadmin',
            });
        const adminRole: RoleEntity =
            await this.roleService.findOne<RoleEntity>({
                name: 'admin',
            });
        const userRole: RoleEntity = await this.roleService.findOne<RoleEntity>(
            {
                name: 'user',
            }
        );

        try {
            const passwordHash = await this.authService.createPassword(
                'aaAA@@123444'
            );

            await this.userService.create(
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

            await this.userService.create(
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

            await this.userService.create(
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
