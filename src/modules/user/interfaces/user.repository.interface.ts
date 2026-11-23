import type { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationCursorReturn,
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserDeletedIdentity,
    IUserList,
    IUserName,
    IUserProfile,
    IUserRecipient,
    IUserUpdateProfile,
    IUserUpdateStatus,
    IUserWithPhoto,
} from '@modules/user/interfaces/user.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Prisma, User } from '@generated/prisma-client/client';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';

export interface IUserRepository {
    findWithPaginationOffset(
        { where, ...params }: IPaginationQueryOffsetParams,
        status: Record<string, IPaginationIn> | null,
        roleId: Record<string, IPaginationEqual> | null,
        countryId: Record<string, IPaginationEqual> | null,
        additionalWhere: Prisma.UserWhereInput | null
    ): Promise<IResponsePaginationReturn<IUserList>>;
    findActiveRecipientsCursor(
        cursor: string | null,
        limit: number,
        createdBefore: Date
    ): Promise<IPaginationCursorReturn<IUserRecipient>>;
    findActiveRecipientsByIds(
        ids: string[],
        createdBefore: Date
    ): Promise<IUserRecipient[]>;
    findOneById(id: string): Promise<IUserWithPhoto | null>;
    findOneActiveById(id: string): Promise<User | null>;
    findOneActiveByEmail(email: string): Promise<User | null>;
    findNameById(userId: string): Promise<IUserName | null>;
    findEmailByIdInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<string | null>;
    findOneWithRoleByEmail(email: string): Promise<IUser | null>;
    findOneProfileById(
        id: string,
        additionalWhere: Prisma.UserWhereInput | null
    ): Promise<IUserProfile | null>;
    findOneActiveProfileById(id: string): Promise<IUserProfile | null>;
    findOneWithRoleById(
        id: string,
        additionalWhere: Prisma.UserWhereInput | null
    ): Promise<IUser | null>;
    findByEmails(emails: string[]): Promise<IUser[]>;
    findByUsernames(usernames: string[]): Promise<IUser[]>;
    findExport(
        status: Record<string, IPaginationIn> | null,
        roleId: Record<string, IPaginationEqual> | null,
        countryId: Record<string, IPaginationEqual> | null,
        take: number,
        additionalWhere: Prisma.UserWhereInput | null
    ): Promise<IUser[]>;
    existsByEmail(email: string): Promise<boolean>;
    existsByUsername(username: string): Promise<boolean>;
    createInTx(
        tx: IDatabaseTransactionClient,
        input: IUserCreateWithWorkspaceInput
    ): Promise<IUser>;
    createManyInTx(
        tx: IDatabaseTransactionClient,
        inputs: IUserCreateWithWorkspaceInput[]
    ): Promise<IUser[]>;
    updateStatusByAdminInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        currentStatus: EnumUserStatus,
        { status, passwordAttempt, passwordLockedUntil }: IUserUpdateStatus
    ): Promise<User | null>;
    updateProfileInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { countryId, ...data }: IUserUpdateProfile
    ): Promise<User>;
    updatePhotoProfileInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        photo: IAwsS3
    ): Promise<User>;
    deleteSelfInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { email, username }: IUserDeletedIdentity,
        deletedAt: Date
    ): Promise<void>;
    claimUsernameInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { username }: UserClaimUsernameRequestDto
    ): Promise<User>;
    setLastWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        workspaceId: string
    ): Promise<void>;
    clearLastWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        workspaceId: string
    ): Promise<void>;
    updatePasswordInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { passwordCreated, passwordExpired, passwordHash }: IAuthPassword,
        updatedBy: string
    ): Promise<User>;
    incrementPasswordAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        maxAttempt: number,
        lockedUntil: Date
    ): Promise<boolean>;
    resetPasswordAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<User>;
    markVerifiedBySocialInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        verifiedAt: Date
    ): Promise<User>;
    markVerifiedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        verifiedAt: Date
    ): Promise<User>;
    updateLoginInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        ipAddress: string | null,
        loginAt: Date
    ): Promise<User>;
    touchUpdatedByInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void>;
}
