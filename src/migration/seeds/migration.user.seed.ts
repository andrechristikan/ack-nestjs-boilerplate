import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { AuthService } from 'src/common/auth/services/auth.service';
import { UserService } from 'src/modules/user/services/user.service';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { RoleDoc } from 'src/modules/role/repository/entities/role.entity';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_USER_SIGN_UP_FROM } from 'src/modules/user/constants/user.enum.constant';
import { CountryDoc } from 'src/modules/country/repository/entities/country.entity';
import { CountryService } from 'src/modules/country/services/country.service';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/constants/message.enum.constant';
import { UserPasswordHistoryService } from 'src/modules/user/services/user-password-history.service';
import { UserStateHistoryService } from 'src/modules/user/services/user-state-history.service';

@Injectable()
export class MigrationUserSeed {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly userPasswordHistoryService: UserPasswordHistoryService,
        private readonly userStateHistoryService: UserStateHistoryService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService
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
        const country: CountryDoc = await this.countryService.findOneByAlpha2(
            ENUM_MESSAGE_LANGUAGE.EN
        );

        try {
            const user1: UserDoc = await this.userService.create(
                {
                    role: superAdminRole._id,
                    name: 'superadmin',
                    email: 'superadmin@mail.com',
                    country: country._id,
                },
                passwordHash,
                ENUM_USER_SIGN_UP_FROM.ADMIN
            );

            const user2: UserDoc = await this.userService.create(
                {
                    role: adminRole._id,
                    name: 'admin',
                    email: 'admin@mail.com',
                    country: country._id,
                },
                passwordHash,
                ENUM_USER_SIGN_UP_FROM.ADMIN
            );
            const user3: UserDoc = await this.userService.create(
                {
                    role: userRole._id,
                    name: 'user',
                    email: 'user@mail.com',
                    country: country._id,
                },
                passwordHash,
                ENUM_USER_SIGN_UP_FROM.ADMIN
            );
            const user4: UserDoc = await this.userService.create(
                {
                    role: memberRole._id,
                    name: 'member',
                    email: 'member@mail.com',
                    country: country._id,
                },
                passwordHash,
                ENUM_USER_SIGN_UP_FROM.ADMIN
            );

            await this.userStateHistoryService.createCreated(user1, user1._id);
            await this.userStateHistoryService.createCreated(user2, user2._id);
            await this.userStateHistoryService.createCreated(user3, user3._id);
            await this.userStateHistoryService.createCreated(user4, user4._id);
            await this.userPasswordHistoryService.createByAdmin(
                user1,
                user1._id
            );
            await this.userPasswordHistoryService.createByAdmin(
                user2,
                user1._id
            );
            await this.userPasswordHistoryService.createByAdmin(
                user3,
                user1._id
            );
            await this.userPasswordHistoryService.createByAdmin(
                user4,
                user1._id
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
            await this.userService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
