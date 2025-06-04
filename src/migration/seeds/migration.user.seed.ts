import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { AuthService } from '@module/auth/services/auth.service';
import { UserService } from '@module/user/services/user.service';
import { RoleDoc } from '@module/role/repository/entities/role.entity';
import { RoleService } from '@module/role/services/role.service';
import {
    ENUM_USER_GENDER,
    ENUM_USER_SIGN_UP_FROM,
} from '@module/user/enums/user.enum';
import { CountryDoc } from '@module/country/repository/entities/country.entity';
import { CountryService } from '@module/country/services/country.service';
import { PasswordHistoryService } from '@module/password-history/services/password-history.service';
import { ActivityService } from '@module/activity/services/activity.service';
import { MessageService } from '@common/message/services/message.service';
import { ENUM_PASSWORD_HISTORY_TYPE } from '@module/password-history/enums/password-history.enum';
import { SessionService } from '@module/session/services/session.service';
import { VerificationService } from '@module/verification/services/verification.service';

@Injectable()
export class MigrationUserSeed {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly activityService: ActivityService,
        private readonly messageService: MessageService,
        private readonly sessionService: SessionService,
        private readonly verificationService: VerificationService
    ) {}

    @Command({
        command: 'seed:user',
        describe: 'seed users',
    })
    async seeds(): Promise<void> {
        const password = 'aaAA@123';
        const passwordHash = this.authService.createPassword(password);
        const superAdminRole: RoleDoc =
            await this.roleService.findOneByName('superadmin');
        const adminRole: RoleDoc =
            await this.roleService.findOneByName('admin');

        const country: CountryDoc =
            await this.countryService.findOneByAlpha2('ID');

        const individualRole: RoleDoc =
            await this.roleService.findOneByName('individual');
        const premiumRole: RoleDoc =
            await this.roleService.findOneByName('premium');
        const businessRole: RoleDoc =
            await this.roleService.findOneByName('business');

        try {
            const users = await Promise.all([
                this.userService.create(
                    {
                        role: superAdminRole._id,
                        name: 'superadmin',
                        email: 'superadmin@mail.com',
                        country: country._id,
                        gender: ENUM_USER_GENDER.MALE,
                    },
                    passwordHash,
                    ENUM_USER_SIGN_UP_FROM.SEED
                ),
                this.userService.create(
                    {
                        role: adminRole._id,
                        name: 'admin',
                        email: 'admin@mail.com',
                        country: country._id,
                        gender: ENUM_USER_GENDER.MALE,
                    },
                    passwordHash,
                    ENUM_USER_SIGN_UP_FROM.SEED
                ),
                this.userService.create(
                    {
                        role: individualRole._id,
                        name: 'individual',
                        email: 'individual@mail.com',
                        country: country._id,
                        gender: ENUM_USER_GENDER.MALE,
                    },
                    passwordHash,
                    ENUM_USER_SIGN_UP_FROM.SEED
                ),
                this.userService.create(
                    {
                        role: premiumRole._id,
                        name: 'premium',
                        email: 'premium@mail.com',
                        country: country._id,
                        gender: ENUM_USER_GENDER.MALE,
                    },
                    passwordHash,
                    ENUM_USER_SIGN_UP_FROM.SEED
                ),
                this.userService.create(
                    {
                        role: businessRole._id,
                        name: 'business',
                        email: 'business@mail.com',
                        country: country._id,
                        gender: ENUM_USER_GENDER.MALE,
                    },
                    passwordHash,
                    ENUM_USER_SIGN_UP_FROM.SEED
                ),
            ]);

            for (const user of users) {
                const verification =
                    await this.verificationService.createEmailByUser(user);

                const promises = [
                    this.userService.updateVerificationEmail(user),
                    this.activityService.createByAdmin(user, {
                        by: user._id,
                        description: this.messageService.setMessage(
                            'activity.user.createByAdmin'
                        ),
                    }),
                    this.passwordHistoryService.createByAdmin(user, {
                        by: user._id,
                        type: ENUM_PASSWORD_HISTORY_TYPE.SIGN_UP,
                    }),
                    this.verificationService.verify(verification),
                ];

                await Promise.all(promises);
            }
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
            await this.activityService.deleteMany();
            await this.passwordHistoryService.deleteMany();
            await this.sessionService.resetLoginSession();
            await this.sessionService.deleteMany();
            await this.userService.deleteMany();
            await this.verificationService.deleteMany();
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }
}
