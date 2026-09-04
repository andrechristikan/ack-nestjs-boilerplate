import { DatabaseIdResponseDto } from '@common/database/dtos/response/database.id.response.dto';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import {
    UserCheckEmailRequestDto,
    UserCheckUsernameRequestDto,
} from '@modules/user/dtos/request/user.check.request.dto';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import {
    UserCheckEmailResponseDto,
    UserCheckUsernameResponseDto,
} from '@modules/user/dtos/response/user.check.response.dto';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';

export interface IUserHttpService {
    getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>>;
    getOne(id: string): Promise<IResponseReturn<UserProfileResponseDto>>;
    createByAdmin(
        body: UserCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdResponseDto>>;
    updateStatusByAdmin(
        userId: string,
        { status }: UserUpdateStatusRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    checkUsername({
        username,
    }: UserCheckUsernameRequestDto): Promise<
        IResponseReturn<UserCheckUsernameResponseDto>
    >;
    checkEmail({
        email,
    }: UserCheckEmailRequestDto): Promise<
        IResponseReturn<UserCheckEmailResponseDto>
    >;
    deleteSelf(userId: string): Promise<void>;
}
