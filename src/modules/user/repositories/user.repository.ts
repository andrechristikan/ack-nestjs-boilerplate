import type { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { TwoFactorActiveBackupCodesFilter } from '@modules/user/constants/user.constant';
import type { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import type { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.update-profile.request.dto';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import type {
    IUser,
    IUserContact,
    IUserCreateWithWorkspaceInput,
    IUserExport,
    IUserList,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import type { IUserRepository } from '@modules/user/interfaces/user.repository.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { TermPolicyAcceptedColumnMap } from '@modules/term-policy/constants/term-policy.constant';
import type { IWorkspaceInviteInviter } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class UserRepository implements IUserRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly paginationService: PaginationService,
        private readonly helperDateService: HelperDateService
    ) {}

    private buildUserCreateData(
        input: IUserCreateWithWorkspaceInput
    ): Prisma.UserUncheckedCreateInput {
        const termPolicyAcceptedData = Object.fromEntries(
            Object.entries(input.termPolicy).map(([type, accepted]) => [
                TermPolicyAcceptedColumnMap[type as EnumTermPolicyType],
                accepted,
            ])
        );

        return {
            id: input.userId,
            email: input.email,
            countryId: input.countryId,
            name: input.name,
            roleId: input.roleId,
            signUpFrom: input.signUpFrom,
            signUpWith: input.signUpWith,
            username: input.username,
            isVerified: input.isVerified,
            status: EnumUserStatus.active,
            lastWorkspaceId: input.workspaceContext.workspaceId,
            lastWorkspaceChangedAt: this.helperDateService.create(),
            ...termPolicyAcceptedData,
            createdBy: input.createdBy,
            deletedAt: null,
            ...(input.password
                ? {
                      passwordCreated: input.password.passwordCreated,
                      passwordExpired: input.password.passwordExpired,
                      password: input.password.passwordHash,
                      passwordAttempt: 0,
                  }
                : {}),
        };
    }

    async findWithPaginationOffset(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IUserList>> {
        return this.paginationService.offset<IUserList, Prisma.UserWhereInput>(
            this.databaseService.client.user,
            {
                ...params,
                where: {
                    ...where,
                    ...status,
                    ...countryId,
                    ...roleId,
                    deletedAt: null,
                },
                include: {
                    role: { include: { policies: true } },
                    twoFactor: {
                        include: {
                            backupCodes: {
                                where: TwoFactorActiveBackupCodesFilter,
                            },
                        },
                    },
                    photo: true,
                },
            }
        );
    }

    async findActive(): Promise<IUserContact[]> {
        return this.databaseService.client.user.findMany({
            where: {
                status: EnumUserStatus.active,
                deletedAt: null,
            },
            select: {
                id: true,
                username: true,
                email: true,
            },
        });
    }

    async findOneById(id: string): Promise<User | null> {
        return this.databaseService.client.user.findUnique({
            where: { id, deletedAt: null },
        });
    }

    async findOneActiveById(id: string): Promise<User | null> {
        return this.databaseService.client.user.findUnique({
            where: { id, deletedAt: null, status: EnumUserStatus.active },
        });
    }

    async findOneActiveByEmail(email: string): Promise<User | null> {
        return this.databaseService.client.user.findUnique({
            where: { email, deletedAt: null, status: EnumUserStatus.active },
        });
    }

    async findNameById(
        userId: string
    ): Promise<IWorkspaceInviteInviter | null> {
        return this.databaseService.client.user.findUnique({
            where: { id: userId },
            select: { name: true, username: true },
        });
    }

    async findOneWithRoleByEmail(email: string): Promise<IUser | null> {
        return this.databaseService.client.user.findUnique({
            where: { email, deletedAt: null },
            include: {
                role: { include: { policies: true } },
                twoFactor: {
                    include: {
                        backupCodes: {
                            where: TwoFactorActiveBackupCodesFilter,
                        },
                    },
                },
            },
        });
    }

    async findOneProfileById(id: string): Promise<IUserProfile | null> {
        return this.databaseService.client.user.findUnique({
            where: { id, deletedAt: null },
            include: {
                role: { include: { policies: true } },
                country: true,
                twoFactor: {
                    include: {
                        backupCodes: {
                            where: TwoFactorActiveBackupCodesFilter,
                        },
                    },
                },
                photo: true,
                mobileNumbers: {
                    include: {
                        country: true,
                    },
                },
            },
        });
    }

    async findOneActiveProfileById(id: string): Promise<IUserProfile | null> {
        return this.databaseService.client.user.findUnique({
            where: { id, deletedAt: null, status: EnumUserStatus.active },
            include: {
                role: { include: { policies: true } },
                country: true,
                twoFactor: {
                    include: {
                        backupCodes: {
                            where: TwoFactorActiveBackupCodesFilter,
                        },
                    },
                },
                photo: true,
                mobileNumbers: {
                    include: {
                        country: true,
                    },
                },
            },
        });
    }

    async findOneWithRoleById(id: string): Promise<IUser | null> {
        return this.databaseService.client.user.findUnique({
            where: { id, deletedAt: null },
            include: {
                role: { include: { policies: true } },
                twoFactor: {
                    include: {
                        backupCodes: {
                            where: TwoFactorActiveBackupCodesFilter,
                        },
                    },
                },
            },
        });
    }

    async findByEmails(emails: string[]): Promise<IUser[]> {
        return this.databaseService.client.user.findMany({
            where: {
                email: { in: emails },
            },
            include: {
                role: { include: { policies: true } },
                twoFactor: {
                    include: {
                        backupCodes: {
                            where: TwoFactorActiveBackupCodesFilter,
                        },
                    },
                },
            },
        });
    }

    async findByUsernames(usernames: string[]): Promise<IUser[]> {
        return this.databaseService.client.user.findMany({
            where: {
                username: { in: usernames },
            },
            include: {
                role: { include: { policies: true } },
                twoFactor: {
                    include: {
                        backupCodes: {
                            where: TwoFactorActiveBackupCodesFilter,
                        },
                    },
                },
            },
        });
    }

    async findExport(
        status: Record<string, IPaginationIn> | null,
        roleId: Record<string, IPaginationEqual> | null,
        countryId: Record<string, IPaginationEqual> | null,
        take: number
    ): Promise<IUserExport[]> {
        return this.databaseService.client.user.findMany({
            where: {
                ...status,
                ...countryId,
                ...roleId,
                deletedAt: null,
            },
            include: {
                role: { include: { policies: true } },
                photo: true,
            },
            take,
        });
    }

    async existsByEmail(email: string): Promise<boolean> {
        const count = await this.databaseService.client.user.count({
            where: { email },
        });

        return count > 0;
    }

    async existsByUsername(username: string): Promise<boolean> {
        const count = await this.databaseService.client.user.count({
            where: { username },
        });

        return count > 0;
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        input: IUserCreateWithWorkspaceInput
    ): Promise<IUser> {
        const createData = this.buildUserCreateData(input);
        const user = await tx.user.create({
            data: createData,
            include: {
                role: { include: { policies: true } },
            },
        });

        return { ...user, twoFactor: null };
    }

    async createManyInTx(
        tx: IDatabaseTransactionClient,
        inputs: IUserCreateWithWorkspaceInput[]
    ): Promise<IUser[]> {
        return Promise.all(inputs.map(input => this.createInTx(tx, input)));
    }

    async updateStatusByAdminInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        { status }: UserUpdateStatusRequestDto
    ): Promise<User> {
        return tx.user.update({
            where: { id, deletedAt: null },
            data: {
                status,
            },
        });
    }

    async updateProfile(
        userId: string,
        { countryId, ...data }: UserUpdateProfileRequestDto
    ): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                ...data,
                countryId,
            },
        });
    }

    async updatePhotoProfile(userId: string, photo: IAwsS3): Promise<User> {
        const plainPhoto = this.databaseUtil.toPlainObject(photo);

        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                photo: plainPhoto,
            },
        });
    }

    async deleteSelfInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deletedAt: Date
    ): Promise<User> {
        return tx.user.softDelete({
            where: { id: userId, deletedAt: null },
            data: {
                deletedAt,
                status: EnumUserStatus.inactive,
            },
        }) as Promise<User>;
    }

    async claimUsername(
        userId: string,
        { username }: UserClaimUsernameRequestDto
    ): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                username,
            },
        });
    }

    async setLastWorkspace(userId: string, workspaceId: string): Promise<void> {
        const today = this.helperDateService.create();

        await this.databaseService.client.user.update({
            where: { id: userId },
            data: {
                lastWorkspaceId: workspaceId,
                lastWorkspaceChangedAt: today,
            },
        });
    }

    async setLastWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        workspaceId: string
    ): Promise<void> {
        const today = this.helperDateService.create();

        await tx.user.update({
            where: { id: userId },
            data: {
                lastWorkspaceId: workspaceId,
                lastWorkspaceChangedAt: today,
            },
        });
    }

    async updatePasswordInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { passwordCreated, passwordExpired, passwordHash }: IAuthPassword,
        updatedBy: string
    ): Promise<User> {
        return tx.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                password: passwordHash,
                passwordCreated,
                passwordExpired,
                passwordAttempt: 0,
                updatedBy,
            },
        });
    }

    async increasePasswordAttempt(userId: string): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                passwordAttempt: {
                    increment: 1,
                },
            },
        });
    }

    async resetPasswordAttempt(userId: string): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                passwordAttempt: 0,
            },
        });
    }

    async deactivateForMaxPasswordAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await tx.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                status: EnumUserStatus.inactive,
                updatedBy: userId,
            },
        });
    }

    async markVerified(userId: string, verifiedAt: Date): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                isVerified: true,
                verifiedAt,
                updatedBy: userId,
            },
        });
    }

    async markVerifiedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        verifiedAt: Date
    ): Promise<User> {
        return tx.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                isVerified: true,
                verifiedAt,
                updatedBy: userId,
            },
        });
    }

    async updateLoginInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        ipAddress: string | null,
        loginAt: Date
    ): Promise<User> {
        return tx.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                lastLoginAt: loginAt,
                lastIPAddress: ipAddress,
                lastLoginFrom: loginFrom,
                lastLoginWith: loginWith,
                updatedBy: userId,
            },
        });
    }

    async acceptTermPolicyInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        type: EnumTermPolicyType
    ): Promise<void> {
        await tx.user.update({
            where: {
                id: userId,
                deletedAt: null,
                status: EnumUserStatus.active,
            },
            data: {
                [TermPolicyAcceptedColumnMap[type]]: true,
            },
        });
    }

    async resetTermPolicyForActiveUsersInTx(
        tx: IDatabaseTransactionClient,
        type: EnumTermPolicyType
    ): Promise<void> {
        await tx.user.updateMany({
            where: {
                deletedAt: null,
                status: EnumUserStatus.active,
            },
            data: {
                [TermPolicyAcceptedColumnMap[type]]: false,
            },
        });
    }

    async touchUpdatedByInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await tx.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                updatedBy: userId,
            },
        });
    }
}
