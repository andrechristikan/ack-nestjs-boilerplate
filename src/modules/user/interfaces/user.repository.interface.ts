import type { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
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
import {
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    Prisma,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceInviteInviter } from '@modules/workspace/interfaces/workspace.interface';

export interface IUserRepository {
    findWithPaginationOffset(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePaginationReturn<IUserList>>;
    findActive(): Promise<IUserContact[]>;
    findOneById(id: string): Promise<User | null>;
    findOneActiveById(id: string): Promise<User | null>;
    findOneActiveByEmail(email: string): Promise<User | null>;
    findNameById(userId: string): Promise<IWorkspaceInviteInviter | null>;
    findOneWithRoleByEmail(email: string): Promise<IUser | null>;
    findOneProfileById(id: string): Promise<IUserProfile | null>;
    findOneActiveProfileById(id: string): Promise<IUserProfile | null>;
    findOneWithRoleById(id: string): Promise<IUser | null>;
    findByEmails(emails: string[]): Promise<IUser[]>;
    findByUsernames(usernames: string[]): Promise<IUser[]>;
    findExport(
        status: Record<string, IPaginationIn> | null,
        roleId: Record<string, IPaginationEqual> | null,
        countryId: Record<string, IPaginationEqual> | null,
        take: number
    ): Promise<IUserExport[]>;
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
        { status }: UserUpdateStatusRequestDto
    ): Promise<User>;
    updateProfile(
        userId: string,
        { countryId, ...data }: UserUpdateProfileRequestDto
    ): Promise<User>;
    updatePhotoProfile(userId: string, photo: IAwsS3): Promise<User>;
    deleteSelfInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deletedAt: Date
    ): Promise<User>;
    claimUsername(
        userId: string,
        { username }: UserClaimUsernameRequestDto
    ): Promise<User>;
    setLastWorkspace(userId: string, workspaceId: string): Promise<void>;
    setLastWorkspaceInTx(
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
    increasePasswordAttempt(userId: string): Promise<User>;
    resetPasswordAttempt(userId: string): Promise<User>;
    deactivateForMaxPasswordAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void>;
    markVerified(userId: string, verifiedAt: Date): Promise<User>;
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
    acceptTermPolicyInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        type: EnumTermPolicyType
    ): Promise<void>;
    resetTermPolicyForActiveUsersInTx(
        tx: IDatabaseTransactionClient,
        type: EnumTermPolicyType
    ): Promise<void>;
    touchUpdatedByInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void>;
}
