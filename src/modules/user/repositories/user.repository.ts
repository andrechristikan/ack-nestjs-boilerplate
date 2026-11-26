import { DatabaseRepositoryBase } from '@common/database/bases/database.repository.base';
import { UserDatabaseErrorContract } from '@modules/user/contracts/user.database-error.contract';
import type { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationCursorReturn,
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import {
    UserActiveRecipientCursorScope,
    UserAdminListSelect,
    UserNotDeletedWhere,
    UserProfileInclude,
    UserRecipientSelect,
    UserStateSelect,
    UserWithRoleInclude,
} from '@modules/user/constants/user.constant';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserDeletedIdentity,
    IUserList,
    IUserProfile,
    IUserRecipient,
    IUserUpdateProfile,
    IUserUpdateStatus,
} from '@modules/user/interfaces/user.interface';
import type { IUserRepository } from '@modules/user/interfaces/user.repository.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserRepository
    extends DatabaseRepositoryBase
    implements IUserRepository
{
    protected override readonly errorContract = UserDatabaseErrorContract;

    constructor(
        private readonly databaseService: DatabaseService,
        protected override readonly databaseUtil: DatabaseUtil,
        private readonly paginationService: PaginationService,
        private readonly helperDateService: HelperDateService
    ) {
        super();
    }

    private buildExportWhere(
        status: EnumUserStatus[],
        roleId: string | null,
        countryId: string | null
    ): Prisma.UserWhereInput {
        return {
            status: { in: status },
            ...(roleId !== null && { roleId }),
            ...(countryId !== null && { countryId }),
            deletedAt: null,
        };
    }

    private buildUserCreateData(
        input: IUserCreateWithWorkspaceInput
    ): Prisma.UserCreateManyInput {
        const lastWorkspaceChangedAt = this.helperDateService.now();

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
            verifiedAt: input.verifiedAt,
            status: EnumUserStatus.active,
            lastWorkspaceId: input.workspaceContext.workspaceId,
            lastWorkspaceChangedAt,
            lastLoginAt: input.login?.loginAt ?? null,
            lastIpAddress: input.login?.ipAddress ?? null,
            lastLoginFrom: input.login?.loginFrom ?? null,
            lastLoginWith: input.login?.loginWith ?? null,
            createdAt: input.createdAt,
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
        { where, ...params }: IPaginationQueryOffsetParams,
        status: Record<string, IPaginationIn> | null,
        roleId: Record<string, IPaginationEqual> | null,
        countryId: Record<string, IPaginationEqual> | null
    ): Promise<IResponsePaginationReturn<IUserList>> {
        return this.paginationService.offset(this.databaseService.client.user, {
            ...params,
            where: {
                ...where,
                ...status,
                ...countryId,
                ...roleId,
                deletedAt: null,
            },
            select: UserAdminListSelect,
        });
    }

    async findActiveRecipientsCursor(
        cursor: string | null,
        limit: number,
        createdBefore: Date
    ): Promise<IPaginationCursorReturn<IUserRecipient>> {
        return this.paginationService.cursor(this.databaseService.client.user, {
            where: {
                ...UserNotDeletedWhere,
                status: EnumUserStatus.active,
                createdAt: { lte: createdBefore },
            },
            orderBy: [{ id: EnumPaginationOrderDirectionType.asc }],
            limit,
            fingerprint: UserActiveRecipientCursorScope,
            select: UserRecipientSelect,
            ...(cursor !== null && { cursor }),
        });
    }

    async findActiveRecipientsByIds(
        ids: string[],
        createdBefore: Date
    ): Promise<IUserRecipient[]> {
        return this.databaseService.client.user.findMany({
            where: {
                ...UserNotDeletedWhere,
                status: EnumUserStatus.active,
                id: { in: ids },
                createdAt: { lte: createdBefore },
            },
            select: UserRecipientSelect,
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

    async findOneWithRoleByEmail(email: string): Promise<IUser | null> {
        return this.databaseService.client.user.findUnique({
            where: { email, deletedAt: null },
            include: UserWithRoleInclude,
        });
    }

    async findOneProfileById(id: string): Promise<IUserProfile | null> {
        return this.databaseService.client.user.findUnique({
            where: { id, deletedAt: null },
            include: UserProfileInclude,
        });
    }

    async findOneWithRoleById(id: string): Promise<IUser | null> {
        return this.databaseService.client.user.findUnique({
            where: { id, deletedAt: null },
            include: UserWithRoleInclude,
        });
    }

    async findByEmailsOrUsernames(
        emails: string[],
        usernames: string[]
    ): Promise<IUserRecipient[]> {
        return this.databaseService.client.user.findMany({
            where: {
                OR: [
                    { email: { in: emails } },
                    { username: { in: usernames } },
                ],
            },
            select: UserRecipientSelect,
        });
    }

    async findExport(
        status: EnumUserStatus[],
        roleId: string | null,
        countryId: string | null,
        take: number
    ): Promise<IUserList[]> {
        const where = this.buildExportWhere(status, roleId, countryId);

        return this.databaseService.client.user.findMany({
            where,
            select: UserAdminListSelect,
            take,
        });
    }

    async countExport(
        status: EnumUserStatus[],
        roleId: string | null,
        countryId: string | null
    ): Promise<number> {
        const where = this.buildExportWhere(status, roleId, countryId);

        return this.databaseService.client.user.count({ where });
    }

    async countByIds(userIds: string[]): Promise<number> {
        return this.databaseService.client.user.count({
            where: { id: { in: userIds } },
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

        try {
            return await tx.user.create({
                data: createData,
                include: UserWithRoleInclude,
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async createManyInTx(
        tx: IDatabaseTransactionClient,
        inputs: IUserCreateWithWorkspaceInput[]
    ): Promise<void> {
        const data = inputs.map(input => this.buildUserCreateData(input));

        try {
            await tx.user.createMany({ data });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async updateStatusByAdminInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        currentStatus: EnumUserStatus,
        { status, passwordAttempt, passwordLockedUntil }: IUserUpdateStatus
    ): Promise<User> {
        try {
            return await tx.user.update({
                where: { id, status: currentStatus, deletedAt: null },
                data: {
                    status,
                    passwordAttempt,
                    passwordLockedUntil,
                },
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async updateProfileInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { countryId, gender, name }: IUserUpdateProfile
    ): Promise<User> {
        return tx.user.update({
            where: { id: userId, deletedAt: null },
            data: { name, gender, countryId },
        });
    }

    async updatePhotoProfileInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        photo: IAwsS3
    ): Promise<User> {
        const plainPhoto = this.databaseUtil.toPlainObject(photo);

        return tx.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                photo: plainPhoto,
            },
        });
    }

    async deleteSelfInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { email, username }: IUserDeletedIdentity,
        deletedAt: Date
    ): Promise<void> {
        await tx.user.softDelete({
            where: { id: userId, deletedAt: null },
            data: {
                email,
                username,
                deletedAt,
                deletedBy: userId,
                updatedBy: userId,
                status: EnumUserStatus.inactive,
                password: null,
                passwordCreated: null,
                passwordExpired: null,
                passwordAttempt: 0,
                passwordLockedUntil: null,
                name: null,
                gender: null,
                photo: null,
                lastIpAddress: null,
                lastLoginAt: null,
                lastLoginFrom: null,
                lastLoginWith: null,
            },
        });
    }

    async claimUsernameInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { username }: UserClaimUsernameRequestDto
    ): Promise<User> {
        try {
            return await tx.user.update({
                where: { id: userId, deletedAt: null },
                data: {
                    username,
                },
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async setLastWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        workspaceId: string
    ): Promise<void> {
        const today = this.helperDateService.now();

        await tx.user.update({
            where: { id: userId },
            data: {
                lastWorkspaceId: workspaceId,
                lastWorkspaceChangedAt: today,
            },
        });
    }

    async clearLastWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        workspaceId: string
    ): Promise<void> {
        const today = this.helperDateService.now();

        await tx.user.updateMany({
            where: { id: userId, lastWorkspaceId: workspaceId },
            data: {
                lastWorkspaceId: null,
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
        try {
            return await tx.user.update({
                where: { id: userId, deletedAt: null },
                data: {
                    password: passwordHash,
                    passwordCreated,
                    passwordExpired,
                    passwordAttempt: 0,
                    passwordLockedUntil: null,
                    updatedBy,
                },
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async incrementPasswordAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        maxAttempt: number,
        lockedUntil: Date
    ): Promise<boolean> {
        const { passwordAttempt } = await tx.user.update({
            where: { id: userId, deletedAt: null },
            data: { passwordAttempt: { increment: 1 } },
            select: UserStateSelect,
        });
        if (passwordAttempt < maxAttempt) {
            return false;
        }

        await tx.user.update({
            where: { id: userId, deletedAt: null },
            data: { passwordAttempt: 0, passwordLockedUntil: lockedUntil },
        });

        return true;
    }

    async resetPasswordAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<User> {
        try {
            return await tx.user.update({
                where: { id: userId, deletedAt: null },
                data: { passwordAttempt: 0, passwordLockedUntil: null },
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async markVerifiedBySocialInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        verifiedAt: Date
    ): Promise<User> {
        return tx.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                isVerified: true,
                verifiedAt,
                password: null,
                passwordCreated: null,
                passwordExpired: null,
                passwordAttempt: 0,
                updatedBy: userId,
            },
        });
    }

    async markVerifiedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        verifiedAt: Date
    ): Promise<User> {
        try {
            return await tx.user.update({
                where: { id: userId, deletedAt: null, isVerified: false },
                data: {
                    isVerified: true,
                    verifiedAt,
                    updatedBy: userId,
                },
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async updateLoginInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        ipAddress: string | null,
        loginAt: Date,
        isPasswordAttemptReset: boolean
    ): Promise<User> {
        return tx.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                lastLoginAt: loginAt,
                lastIpAddress: ipAddress,
                lastLoginFrom: loginFrom,
                lastLoginWith: loginWith,
                updatedBy: userId,
                ...(isPasswordAttemptReset && {
                    passwordAttempt: 0,
                    passwordLockedUntil: null,
                }),
            },
        });
    }

    async touchUpdatedByInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        isPasswordChecked: boolean
    ): Promise<void> {
        await tx.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                updatedBy: userId,
                ...(isPasswordChecked && {
                    passwordAttempt: 0,
                    passwordLockedUntil: null,
                }),
            },
        });
    }
}
