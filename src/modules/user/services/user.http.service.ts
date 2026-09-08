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
import { IUserHttpService } from '@modules/user/interfaces/user.http.service.interface';
import {
    IUser,
    IUserCheckEmail,
    IUserCheckUsername,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserHttpService implements IUserHttpService {
    constructor(private readonly userService: UserService) {}

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IUser>> {
        return this.userService.getListOffsetByAdmin(
            pagination,
            status,
            roleId,
            countryId
        );
    }

    async getOne(id: string): Promise<IResponseReturn<IUserProfile>> {
        const user = await this.userService.getOne(id);

        return { data: user };
    }

    async createByAdmin(
        { countryId, email, name, roleId, username }: UserCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdResponseDto>> {
        const id = await this.userService.createByAdmin(
            { countryId, email, name, roleId, username },
            createdBy
        );

        return { data: { id } };
    }

    async updateStatusByAdmin(
        userId: string,
        { status }: UserUpdateStatusRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.userService.updateStatusByAdmin(userId, status, updatedBy);

        return {};
    }

    async checkUsername({
        username,
    }: UserCheckUsernameRequestDto): Promise<
        IResponseReturn<IUserCheckUsername>
    > {
        return { data: await this.userService.checkUsername(username) };
    }

    async checkEmail({
        email,
    }: UserCheckEmailRequestDto): Promise<IResponseReturn<IUserCheckEmail>> {
        return { data: await this.userService.checkEmail(email) };
    }

    async deleteSelf(userId: string): Promise<void> {
        await this.userService.deleteSelf(userId);
    }
}
