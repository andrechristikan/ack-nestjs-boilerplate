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
    IUser,
    IUserCheckEmail,
    IUserCheckUsername,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserHttpService {
    constructor(
        private readonly userDomain: UserDomain,
        private readonly userOnboardingDomain: UserOnboardingDomain,
        private readonly workspaceDomain: WorkspaceDomain
    ) {}

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IUser>> {
        return this.userDomain.getListOffsetByAdmin(
            pagination,
            status,
            roleId,
            countryId
        );
    }

    async getOne(id: string): Promise<IResponseReturn<IUserProfile>> {
        const user = await this.userDomain.getOne(id);

        return { data: user };
    }

    async createByAdmin(
        { countryId, email, name, roleId, username }: UserCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdResponseDto>> {
        const input = await this.userDomain.prepareCreateByAdmin(
            { countryId, email, name, roleId, username },
            createdBy
        );
        const [created] = await this.workspaceDomain.commitOnboarding(
            [input],
            EnumUserCreateMode.admin,
            this.userOnboardingDomain.getCreateTimeoutInMs()
        );
        if (input.password) {
            await this.userDomain.notifyWelcomeByAdmin(
                created.id,
                input.password.passwordEncrypted,
                input.password.passwordCreated,
                input.password.passwordExpired,
                createdBy
            );
        }

        return { data: { id: created.id } };
    }

    async updateStatusByAdmin(
        userId: string,
        { status }: UserUpdateStatusRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.userDomain.updateStatusByAdmin(userId, status, updatedBy);

        return {};
    }

    async checkUsername({
        username,
    }: UserCheckUsernameRequestDto): Promise<
        IResponseReturn<IUserCheckUsername>
    > {
        return { data: await this.userDomain.checkUsername(username) };
    }

    async checkEmail({
        email,
    }: UserCheckEmailRequestDto): Promise<IResponseReturn<IUserCheckEmail>> {
        return { data: await this.userDomain.checkEmail(email) };
    }

    async deleteSelf(userId: string): Promise<void> {
        await this.userDomain.deleteSelf(userId);
    }
}
