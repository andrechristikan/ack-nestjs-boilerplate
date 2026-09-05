import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumUserStatus, Prisma, User } from '@generated/prisma-client';
import {
    IUser,
    IUserCheckEmail,
    IUserCheckUsername,
    IUserContact,
    IUserCreateByAdmin,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';

export interface IUserService {
    validateUserGuard(
        userId: string | null,
        requiredVerified: boolean
    ): Promise<IUser>;
    getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IUser>>;
    getOneActive(userId: string): Promise<User | null>;
    getListActive(): Promise<IUserContact[]>;
    getOne(id: string): Promise<IUserProfile>;
    createByAdmin(
        { countryId, email, name, roleId }: IUserCreateByAdmin,
        createdBy: string
    ): Promise<string>;
    updateStatusByAdmin(
        userId: string,
        status: EnumUserStatus,
        updatedBy: string
    ): Promise<void>;
    checkUsername(username: string): Promise<IUserCheckUsername>;
    checkEmail(email: string): Promise<IUserCheckEmail>;
    deleteSelf(userId: string): Promise<void>;
}
