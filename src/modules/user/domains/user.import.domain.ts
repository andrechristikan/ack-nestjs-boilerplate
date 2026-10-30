import { FileExceedMaxDataExportException } from '@common/file/exceptions/file.exceed-max-data-export.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationEqual,
    IPaginationIn,
} from '@common/pagination/interfaces/pagination.interface';
import {
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
} from '@generated/prisma-client/client';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserImportEmailExistException } from '@modules/user/exceptions/user.import-email-exist.exception';
import { UserImportUsernameExistException } from '@modules/user/exceptions/user.import-username-exist.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import type {
    IUser,
    IUserCreateRole,
    IUserCreateWithWorkspaceInput,
    IUserImport,
    IUserImportPrepared,
    IUserImportUsernameChecks,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserImportDomain {
    private readonly maxDataExport: number;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly userUtil: UserUtil,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService
    ) {
        this.maxDataExport =
            this.configService.get<number>('user.maxDataExport')!;
    }

    async getExistingEmails(emails: string[]): Promise<string[]> {
        const existingUsers = await this.userRepository.findByEmails(emails);

        return existingUsers.map(user => user.email);
    }

    assertEmailsAvailable(existingEmails: string[]): void {
        if (existingEmails.length > 0) {
            throw new UserImportEmailExistException(existingEmails.join(', '));
        }
    }

    async getUsernameChecks(
        usernames: string[]
    ): Promise<IUserImportUsernameChecks> {
        const [existingUsers, badWords] = await Promise.all([
            this.userRepository.findByUsernames(usernames),
            Promise.all(
                usernames.map(username => this.userUtil.checkBadWord(username))
            ),
        ]);

        return {
            existing: existingUsers.map(user => user.username),
            badWords,
        };
    }

    async prepareImportByAdmin(
        data: IUserImport[],
        createdBy: string,
        role: IUserCreateRole,
        countryId: string,
        { existing, badWords }: IUserImportUsernameChecks
    ): Promise<IUserImportPrepared> {
        const usernames = data.map(item => item.username);
        const duplicateUsernames = usernames.filter(
            (username, index) => usernames.indexOf(username) !== index
        );

        if (existing.length > 0) {
            throw new UserImportUsernameExistException(existing.join(', '));
        } else if (duplicateUsernames.length > 0) {
            throw new UserImportUsernameExistException(
                [...new Set(duplicateUsernames)].join(', ')
            );
        } else if (badWords.some(containsBadWord => containsBadWord)) {
            throw new UserUsernameContainBadWordException();
        }

        const totalData = data.length;
        const userIds = Array(totalData)
            .fill(0)
            .map(() => this.databaseUtil.createId());
        const passwords = Array(totalData)
            .fill(0)
            .map(() => this.authPasswordUtil.createPasswordRandom());
        const passwordHasheds = await Promise.all(
            passwords.map(password =>
                this.authPasswordUtil.createPassword(password)
            )
        );
        const workspaceContexts =
            this.userCreateUtil.buildPersonalWorkspaceContexts(usernames);
        const isVerified = role.type !== EnumRoleType.user;
        const inputs: IUserCreateWithWorkspaceInput[] = data.map(
            ({ email, name }, index) => ({
                userId: userIds[index]!,
                email,
                name,
                username: usernames[index]!,
                countryId,
                roleId: role.id,
                signUpFrom: EnumUserSignUpFrom.admin,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified,
                acceptedTermPolicyTypes: [
                    ...UserTermPolicyContract.requiredTypes,
                ],
                password: passwordHasheds[index]!,
                passwordHistoryType:
                    UserCreateContract.admin.passwordHistoryType,
                verification: null,
                workspaceContext: workspaceContexts[index]!,
                createdBy,
            })
        );

        return { inputs, passwordHasheds, passwordStrings: passwords };
    }

    async exportByAdmin(
        status: Record<string, IPaginationIn> | null,
        roleId: Record<string, IPaginationEqual> | null,
        countryId: Record<string, IPaginationEqual> | null
    ): Promise<IUser[]> {
        const users = await this.userRepository.findExport(
            status,
            roleId,
            countryId,
            this.maxDataExport + 1
        );

        if (users.length > this.maxDataExport) {
            throw new FileExceedMaxDataExportException();
        }

        return users;
    }
}
