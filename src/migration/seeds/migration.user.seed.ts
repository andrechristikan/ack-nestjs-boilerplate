import { Command } from 'nestjs-command';
import { Injectable, Logger } from '@nestjs/common';
import { UserRepository } from '@modules/user/repository/repositories/user.repository';
import {
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from '@modules/user/enums/user.enum';
import { RoleRepository } from '@modules/role/repository/repositories/role.repository';
import { CountryRepository } from '@modules/country/repository/repositories/country.repository';
import { AuthService } from '@modules/auth/services/auth.service';
import { HelperService } from '@common/helper/services/helper.service';
import { UserService } from '@modules/user/services/user.service';

@Injectable()
export class MigrationCreateSeed {
    private readonly logger = new Logger(MigrationCreateSeed.name);

    private readonly password = 'aaAA@123';
    private readonly users = [
        {
            country: 'ID',
            email: 'superadmin@mail.com',
            name: 'Super Admin',
            role: 'superadmin',
        },
        {
            country: 'ID',
            email: 'admin@mail.com',
            name: 'Admin',
            role: 'admin',
        },
        {
            country: 'ID',
            email: 'user@mail.com',
            name: 'User',
            role: 'user',
        },
    ];

    constructor(
        private readonly userRepository: UserRepository,
        private readonly roleRepository: RoleRepository,
        private readonly countryRepository: CountryRepository,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly helperService: HelperService
    ) {}

    @Command({
        command: 'seed:user',
        describe: 'seeds users',
    })
    async seeds(): Promise<void> {
        this.logger.log('Seeding Users...');

        const existingUsers = await this.userRepository.findMany({
            where: {
                email: {
                    in: this.users.map(user => user.email),
                },
            },
            select: {
                _id: true,
            },
            withDeleted: true,
        });
        if (existingUsers.length > 0) {
            this.logger.log('Users already exist, skipping seed.');
            return;
        }

        const uniqueRoles = this.helperService.arrayUnique(
            this.users.map(user => user.role)
        );
        const roles = await this.roleRepository.findMany({
            where: {
                name: {
                    in: uniqueRoles,
                },
            },
            select: {
                _id: true,
                name: true,
            },
        });
        if (roles.length !== uniqueRoles.length) {
            this.logger.error('Roles not found for users, cannot seed.');
            return;
        }

        const uniqueCountries = this.helperService.arrayUnique(
            this.users.map(user => user.country)
        );
        const countries = await this.countryRepository.findMany({
            where: {
                alpha2Code: {
                    in: uniqueCountries,
                },
            },
            select: {
                _id: true,
                alpha2Code: true,
            },
        });
        if (countries.length !== uniqueCountries.length) {
            this.logger.error('Countries not found for users, cannot seed.');
            return;
        }

        const today = this.helperService.dateCreate();
        const { passwordCreated, passwordExpired, passwordHash, salt } =
            this.authService.createPassword(this.password);

        await this.userRepository.createMany({
            data: this.users.map(user => ({
                email: user.email.toLowerCase(),
                name: user.name,
                countryId: countries.find(
                    country => country.alpha2Code === user.country
                )._id,
                roleId: roles.find(role => role.name === user.role)._id,
                salt,
                password: passwordHash,
                passwordCreated,
                passwordExpired,
                passwordAttempt: 0,
                signUpDate: today,
                signUpFrom: ENUM_USER_SIGN_UP_FROM.MIGRATION,
                status: ENUM_USER_STATUS.ACTIVE,
                termPolicy: {
                    cookies: false,
                    privacy: false,
                    marketing: false,
                    term: false,
                },
                username: this.userService.createRandomUsername(),
                verification: {
                    email: false,
                    mobileNumber: false,
                },
            })),
        });

        this.logger.log('Users seeded successfully.');

        return;
    }

    @Command({
        command: 'remove:user',
        describe: 'remove users',
    })
    async remove(): Promise<void> {
        this.logger.log('Removing Users...');

        await this.userRepository.deleteMany({
            where: {
                email: {
                    in: this.users.map(user => user.email),
                },
            },
            withDeleted: true,
        });

        this.logger.log('Users removed successfully.');

        return;
    }
}
