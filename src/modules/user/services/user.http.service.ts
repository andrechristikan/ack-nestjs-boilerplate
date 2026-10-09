import type { DatabaseIdResponseDto } from '@common/database/dtos/response/database.id.response.dto';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    UserDefaultAvailableSearch,
    UserDefaultStatus,
} from '@modules/user/constants/user.list.constant';
import type { UserListRequestDto } from '@modules/user/dtos/request/user.list.request.dto';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { UserCheckEmailRequestDto } from '@modules/user/dtos/request/user.check-email.request.dto';
import type { UserCheckUsernameRequestDto } from '@modules/user/dtos/request/user.check-username.request.dto';
import type { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import type {
    IUserCheckEmail,
    IUserCheckUsername,
    IUserList,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { OnboardingDomain } from '@modules/onboarding/domains/onboarding.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserHttpService {
    constructor(
        private readonly userDomain: UserDomain,
        private readonly onboardingDomain: OnboardingDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListOffsetByAdmin(
        query: UserListRequestDto
    ): Promise<IResponsePaginationReturn<IUserList>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.UserWhereInput>(query, {
                availableSearch: UserDefaultAvailableSearch,
            });
        const status = this.paginationQueryUtil.inEnum(
            Prisma.UserScalarFieldEnum.status,
            query.status,
            UserDefaultStatus
        );
        const roleId = this.paginationQueryUtil.equalString(
            Prisma.UserScalarFieldEnum.roleId,
            query.roleId
        );
        const countryId = this.paginationQueryUtil.equalString(
            Prisma.UserScalarFieldEnum.countryId,
            query.countryId
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(status?.storeFilter ?? {}),
                ...(roleId?.storeFilter ?? {}),
                ...(countryId?.storeFilter ?? {}),
            },
        });

        return this.userDomain.getListOffsetByAdmin(
            params,
            status?.where,
            roleId?.where,
            countryId?.where
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
        const id = await this.onboardingDomain.createByAdmin(
            { countryId, email, name: name ?? null, roleId, username },
            createdBy
        );

        return { data: { id } };
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
        const checkUsername = await this.userDomain.checkUsername(username);

        return { data: checkUsername };
    }

    async checkEmail({
        email,
    }: UserCheckEmailRequestDto): Promise<IResponseReturn<IUserCheckEmail>> {
        const checkEmail = await this.userDomain.checkEmail(email);

        return { data: checkEmail };
    }

    async deleteSelf(userId: string): Promise<IResponseReturn<void>> {
        await this.userDomain.deleteSelf(userId);

        return {};
    }
}
