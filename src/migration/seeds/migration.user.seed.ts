import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { UserService } from 'src/modules/user/services/user.service';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { RoleDoc } from 'src/modules/role/repository/entities/role.entity';
import { RoleService } from 'src/modules/role/services/role.service';
import {
    ENUM_USER_PASSWORD_TYPE,
    ENUM_USER_SIGN_UP_FROM,
} from 'src/modules/user/enums/user.enum';
import { CountryDoc } from 'src/modules/country/repository/entities/country.entity';
import { CountryService } from 'src/modules/country/services/country.service';
import { UserPasswordHistoryService } from 'src/modules/user/services/user-password-history.service';
import { UserStateHistoryService } from 'src/modules/user/services/user-state-history.service';
import { faker } from '@faker-js/faker';

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
        const country: CountryDoc =
            await this.countryService.findOneByAlpha2('ID');

        const memberRole: RoleDoc =
            await this.roleService.findOneByName('member');
        const userRole: RoleDoc = await this.roleService.findOneByName('user');
        try {
            const superAdmin: UserDoc = await this.userService.create(
                {
                    role: superAdminRole._id,
                    name: 'superadmin',
                    email: 'superadmin@mail.com',
                    country: country._id,
                },
                passwordHash,
                ENUM_USER_SIGN_UP_FROM.SEED
            );

            const admin: UserDoc = await this.userService.create(
                {
                    role: adminRole._id,
                    name: 'admin',
                    email: 'admin@mail.com',
                    country: country._id,
                },
                passwordHash,
                ENUM_USER_SIGN_UP_FROM.SEED
            );

            const member: UserDoc = await this.userService.create(
                {
                    role: memberRole._id,
                    name: 'member',
                    email: 'member@mail.com',
                    country: country._id,
                },
                passwordHash,
                ENUM_USER_SIGN_UP_FROM.SEED
            );
            const user: UserDoc = await this.userService.create(
                {
                    role: userRole._id,
                    name: 'user',
                    email: 'user@mail.com',
                    country: country._id,
                },
                passwordHash,
                ENUM_USER_SIGN_UP_FROM.SEED
            );

            const promises = [
                this.userStateHistoryService.createCreated(
                    superAdmin,
                    superAdmin._id
                ),
                this.userStateHistoryService.createCreated(
                    admin,
                    superAdmin._id
                ),
                this.userPasswordHistoryService.createByAdmin(superAdmin, {
                    type: ENUM_USER_PASSWORD_TYPE.SIGN_UP_PASSWORD,
                    by: superAdmin._id,
                }),
                this.userPasswordHistoryService.createByAdmin(admin, {
                    type: ENUM_USER_PASSWORD_TYPE.SIGN_UP_PASSWORD,
                    by: superAdmin._id,
                }),
                this.userStateHistoryService.createCreated(
                    member,
                    superAdmin._id
                ),
                this.userPasswordHistoryService.createByAdmin(member, {
                    type: ENUM_USER_PASSWORD_TYPE.SIGN_UP_PASSWORD,
                    by: superAdmin._id,
                }),
                this.userStateHistoryService.createCreated(
                    user,
                    superAdmin._id
                ),
                this.userPasswordHistoryService.createByAdmin(user, {
                    type: ENUM_USER_PASSWORD_TYPE.SIGN_UP_PASSWORD,
                    by: superAdmin._id,
                }),
            ];

            await Promise.all(promises);

            // Add random user
            const randomUser = Array(30)
                .fill(0)
                .map(() =>
                    this.userService.create(
                        {
                            role: userRole._id,
                            name: faker.person.fullName(),
                            email: faker.internet.email(),
                            country: country._id,
                        },
                        passwordHash,
                        ENUM_USER_SIGN_UP_FROM.SEED
                    )
                );

            const promRandomUsers = await Promise.all(randomUser);

            const randomHistoryUser = [];
            for (const user of promRandomUsers) {
                randomHistoryUser.push(
                    this.userStateHistoryService.createCreated(
                        user,
                        superAdmin._id
                    ),
                    this.userPasswordHistoryService.createByAdmin(user, {
                        type: ENUM_USER_PASSWORD_TYPE.SIGN_UP_PASSWORD,
                        by: superAdmin._id,
                    })
                );
            }
            await Promise.all(randomHistoryUser);
        } catch (err: any) {
            throw new Error(err);
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
            throw new Error(err);
        }

        return;
    }
}
