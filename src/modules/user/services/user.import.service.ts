import { AwsS3NotConfiguredException } from '@common/aws/exceptions/aws.s3-not-configured.exception';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { FileExceedMaxDataExportException } from '@common/file/exceptions/file.exceed-max-data-export.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationIn } from '@common/pagination/interfaces/pagination.interface';
import {
    EnumActivityLogAction,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
} from '@generated/prisma-client/client';
import type { EnumUserStatus } from '@generated/prisma-client/client';
import { UserDefaultStatus } from '@modules/user/constants/user.list.constant';
import type { IActivityLogInput } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserImportEmailExistException } from '@modules/user/exceptions/user.import-email-exist.exception';
import { UserImportUsernameExistException } from '@modules/user/exceptions/user.import-username-exist.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import type {
    IUserCreateRole,
    IUserCreateWithWorkspaceInput,
    IUserImport,
    IUserImportChecks,
    IUserImportPrepared,
    IUserImportUsernameChecks,
    IUserList,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserService } from '@modules/user/services/user.service';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserImportService {
    private readonly maxDataExport: number;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly userUtil: UserUtil,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly authPasswordService: AuthPasswordService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly awsS3Service: AwsS3Service,
        private readonly userService: UserService,
        private readonly configService: ConfigService
    ) {
        this.maxDataExport =
            this.configService.get<number>('user.maxDataExport')!;
    }

    assertEmailsAvailable(existingEmails: string[]): void {
        if (existingEmails.length > 0) {
            throw new UserImportEmailExistException(existingEmails.join(', '));
        }
    }

    async getImportByAdminChecks(
        emails: string[],
        usernames: string[]
    ): Promise<IUserImportChecks> {
        const emailSet = new Set(emails);
        const usernameSet = new Set(usernames);
        const badWords = usernames.map(username =>
            this.userUtil.hasBadWord(username)
        );
        const existingUsers = await this.userRepository.findByEmailsOrUsernames(
            emails,
            usernames
        );

        return {
            existingEmails: existingUsers
                .filter(user => emailSet.has(user.email))
                .map(user => user.email),
            usernameChecks: {
                existing: existingUsers
                    .filter(user => usernameSet.has(user.username))
                    .map(user => user.username),
                badWords,
            },
        };
    }

    assertImportByAdminRows(
        data: IUserImport[],
        { existing, badWords }: IUserImportUsernameChecks
    ): void {
        const emails = new Set<string>();
        const duplicateEmails = new Set<string>();
        const usernames = new Set<string>();
        const duplicateUsernames = new Set<string>();
        for (const { email, username } of data) {
            if (emails.has(email)) {
                duplicateEmails.add(email);
            }

            if (usernames.has(username)) {
                duplicateUsernames.add(username);
            }

            emails.add(email);
            usernames.add(username);
        }

        if (duplicateEmails.size > 0) {
            throw new UserImportEmailExistException(
                [...duplicateEmails].join(', ')
            );
        } else if (existing.length > 0) {
            throw new UserImportUsernameExistException(existing.join(', '));
        } else if (duplicateUsernames.size > 0) {
            throw new UserImportUsernameExistException(
                [...duplicateUsernames].join(', ')
            );
        } else if (badWords.some(containsBadWord => containsBadWord)) {
            throw new UserUsernameContainBadWordException();
        }
    }

    async prepareImportByAdmin(
        data: IUserImport[],
        createdBy: string,
        role: IUserCreateRole,
        countryId: string
    ): Promise<IUserImportPrepared> {
        const emails = data.map(item => item.email);
        const usernames = data.map(item => item.username);

        const totalData = data.length;
        const userIds = Array(totalData)
            .fill(0)
            .map(() => this.databaseUtil.createId());
        const passwords = Array(totalData)
            .fill(0)
            .map(() => this.authPasswordService.createRandom());
        const passwordHasheds = await Promise.all(
            passwords.map(password =>
                this.authPasswordService.create(password, {
                    temporary: true,
                })
            )
        );
        const workspaceContexts =
            this.userCreateUtil.buildPersonalWorkspaceContexts(usernames);
        const createdAt = this.helperDateService.now();
        const verifications = emails.map(email =>
            this.userVerificationUtil.createVerified(email)
        );
        const inputs: IUserCreateWithWorkspaceInput[] = data.map(
            ({ email, name }, index) => {
                const verification = verifications[index]!;

                return {
                    userId: userIds[index]!,
                    email,
                    name,
                    username: usernames[index]!,
                    countryId,
                    roleId: role.id,
                    signUpFrom: EnumUserSignUpFrom.admin,
                    signUpWith: EnumUserSignUpWith.credential,
                    isVerified: true,
                    verifiedAt: verification.verifiedAt,
                    acceptedTermPolicyTypes: [],
                    password: passwordHasheds[index]!,
                    passwordHistoryType:
                        UserCreateContract.admin.passwordHistoryType,
                    verification,
                    login: null,
                    workspaceContext: workspaceContexts[index]!,
                    createdAt,
                    createdBy,
                };
            }
        );

        return { inputs, passwordHasheds, passwordStrings: passwords };
    }

    async exportByAdmin(
        status: EnumUserStatus[],
        roleId: string | null,
        countryId: string | null
    ): Promise<IUserList[]> {
        return this.userRepository.findExport(
            status,
            roleId,
            countryId,
            this.maxDataExport
        );
    }

    assertExportByAdminDeliverable(): void {
        const isS3Initialized = this.awsS3Service.isInitialized();
        if (!isS3Initialized) {
            throw new AwsS3NotConfiguredException();
        }

        this.userService.assertEmailDeliverable();
    }

    async assertExportByAdminWithinCap(
        status: EnumUserStatus[],
        roleId: string | null,
        countryId: string | null
    ): Promise<void> {
        const count = await this.userRepository.countExport(
            status,
            roleId,
            countryId
        );

        if (count > this.maxDataExport) {
            throw new FileExceedMaxDataExportException();
        }
    }

    resolveExportByAdminStatus(
        status: Record<string, IPaginationIn> | null
    ): EnumUserStatus[] {
        if (status === null) {
            return UserDefaultStatus;
        }

        const selected = new Set<string>(
            Object.values(status).flatMap(filter => filter.in)
        );

        return UserDefaultStatus.filter(value => selected.has(value));
    }

    buildImportByAdminStages(
        inputs: IUserCreateWithWorkspaceInput[]
    ): IActivityLogInput<EnumActivityLogAction>[] {
        const stages = this.userCreateUtil.buildStages(
            UserCreateContract.admin,
            inputs
        );

        return [
            {
                action: EnumActivityLogAction.adminUserImported,
                metadata: { userCount: inputs.length },
            },
            ...stages,
        ];
    }
}
