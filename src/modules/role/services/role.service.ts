import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleAbilitiesResponseDto } from '@modules/role/dtos/response/role.abilities.response.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { RoleExistException } from '@modules/role/exceptions/role.exist.exception';
import { RoleForbiddenException } from '@modules/role/exceptions/role.forbidden.exception';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RolePredefinedNotFoundException } from '@modules/role/exceptions/role.predefined-not-found.exception';
import { RoleUsedException } from '@modules/role/exceptions/role.used.exception';
import { IRoleService } from '@modules/role/interfaces/role.service.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleUtil } from '@modules/role/utils/role.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { EnumRoleType, Prisma } from '@generated/prisma-client';

@Injectable()
export class RoleService implements IRoleService {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly roleUtil: RoleUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<
            Prisma.RoleSelect,
            Prisma.RoleWhereInput
        >,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>> {
        const { data, ...others } =
            await this.roleRepository.findWithPaginationOffsetByAdmin(
                pagination,
                type
            );

        const roles: RoleListResponseDto[] = this.roleUtil.mapList(data);

        return {
            data: roles,
            ...others,
        };
    }

    async getListCursor(
        pagination: IPaginationQueryCursorParams<
            Prisma.RoleSelect,
            Prisma.RoleWhereInput
        >,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>> {
        const { data, ...others } =
            await this.roleRepository.findWithPaginationCursor(
                pagination,
                type
            );

        const roles: RoleListResponseDto[] = this.roleUtil.mapList(data);

        return {
            data: roles,
            ...others,
        };
    }

    async getOne(id: string): Promise<IResponseReturn<RoleDto>> {
        const role = await this.roleRepository.findOneById(id);
        if (!role) {
            throw new RoleNotFoundException();
        }

        return { data: this.roleUtil.mapOne(role) };
    }

    async getAbilities(
        id: string
    ): Promise<IResponseReturn<RoleAbilitiesResponseDto>> {
        const role = await this.roleRepository.findOneById(id);
        if (!role) {
            throw new RoleNotFoundException();
        }

        return { data: this.roleUtil.mapAbilities(role) };
    }

    async createByAdmin({
        name,
        ...others
    }: RoleCreateRequestDto): Promise<IResponseReturn<RoleDto>> {
        const exist = await this.roleRepository.existByName(name);
        if (exist) {
            throw new RoleExistException();
        }

        const created = await this.roleRepository.create({ name, ...others });

        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.roleUtil.mapActivityLogMetadata(created)
        );

        return {
            data: this.roleUtil.mapOne(created),
        };
    }

    async updateByAdmin(
        id: string,
        data: RoleUpdateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        const role = await this.roleRepository.existById(id);
        if (!role) {
            throw new RoleNotFoundException();
        }

        const updated = await this.roleRepository.update(id, data);

        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.roleUtil.mapActivityLogMetadata(updated)
        );

        return {
            data: this.roleUtil.mapOne(updated),
        };
    }

    async deleteByAdmin(id: string): Promise<IResponseReturn<void>> {
        const [role, roleUsed] = await Promise.all([
            this.roleRepository.existById(id),
            this.roleRepository.used(id),
        ]);

        if (!role) {
            throw new RoleNotFoundException();
        } else if (roleUsed) {
            throw new RoleUsedException();
        }

        const deleted = await this.roleRepository.delete(id);

        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.roleUtil.mapActivityLogMetadata(deleted)
        );

        return {};
    }

    async validateRoleGuard(
        user: IUser | null,
        requiredRoles: EnumRoleType[]
    ): Promise<RoleAbilityDto[]> {
        if (!user) {
            throw new AuthJwtAccessTokenInvalidException();
        }

        const { role } = user;

        if (role.type === EnumRoleType.superAdmin) {
            return [];
        } else if (requiredRoles.length === 0) {
            throw new RolePredefinedNotFoundException();
        } else if (!requiredRoles.includes(role.type)) {
            throw new RoleForbiddenException();
        }

        const abilities = this.roleUtil.mapOne(role).abilities;

        return abilities;
    }
}
