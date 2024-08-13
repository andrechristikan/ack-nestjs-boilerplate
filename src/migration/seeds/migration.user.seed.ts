import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { UserService } from 'src/modules/user/services/user.service';
import { RoleDoc } from 'src/modules/role/repository/entities/role.entity';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_USER_SIGN_UP_FROM } from 'src/modules/user/enums/user.enum';
import { CountryDoc } from 'src/modules/country/repository/entities/country.entity';
import { CountryService } from 'src/modules/country/services/country.service';
import { faker } from '@faker-js/faker';

@Injectable()
export class MigrationUserSeed {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
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
            await this.userService.create(
                {
                    role: superAdminRole._id,
                    name: 'superadmin',
                    email: 'superadmin@mail.com',
                    country: country._id,
                },
                passwordHash,
                ENUM_USER_SIGN_UP_FROM.SEED
            );

            await this.userService.create(
                {
                    role: adminRole._id,
                    name: 'admin',
                    email: 'admin@mail.com',
                    country: country._id,
                },
                passwordHash,
                ENUM_USER_SIGN_UP_FROM.SEED
            );

            await this.userService.create(
                {
                    role: memberRole._id,
                    name: 'member',
                    email: 'member@mail.com',
                    country: country._id,
                },
                passwordHash,
                ENUM_USER_SIGN_UP_FROM.SEED
            );
            await this.userService.create(
                {
                    role: userRole._id,
                    name: 'user',
                    email: 'user@mail.com',
                    country: country._id,
                },
                passwordHash,
                ENUM_USER_SIGN_UP_FROM.SEED
            );

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

            await Promise.all(randomUser);
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
