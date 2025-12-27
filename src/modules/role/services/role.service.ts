import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleAbilitiesResponseDto } from '@modules/role/dtos/response/role.abilities.response.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { IRoleService } from '@modules/role/interfaces/role.service.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleUtil } from '@modules/role/utils/role.util';
import {
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { EnumRoleType } from '@prisma/client';

@Injectable()
export class RoleService implements IRoleService {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly roleUtil: RoleUtil
    ) {}

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams,
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
        pagination: IPaginationQueryCursorParams,
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
            throw new NotFoundException({
                statusCode: EnumRoleStatusCodeError.notFound,
                message: 'role.error.notFound',
            });
        }

        return { data: this.roleUtil.mapOne(role) };
    }

    async getAbilities(
        id: string
    ): Promise<IResponseReturn<RoleAbilitiesResponseDto>> {
        const role = await this.roleRepository.findOneById(id);
        if (!role) {
            throw new NotFoundException({
                statusCode: EnumRoleStatusCodeError.notFound,
                message: 'role.error.notFound',
            });
        }

        return { data: this.roleUtil.mapAbilities(role) };
    }

    async createByAdmin({
        name,
        ...others
    }: RoleCreateRequestDto): Promise<IResponseReturn<RoleDto>> {
        const exist = await this.roleRepository.existByName(name);
        if (exist) {
            throw new ConflictException({
                statusCode: EnumRoleStatusCodeError.exist,
                message: 'role.error.exist',
            });
        }

        const created = await this.roleRepository.create({ name, ...others });
        return {
            data: this.roleUtil.mapOne(created),
            metadataActivityLog: this.roleUtil.mapActivityLogMetadata(created),
        };
    }

    async updateByAdmin(
        id: string,
        data: RoleUpdateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        const role = await this.roleRepository.existById(id);
        if (!role) {
            throw new NotFoundException({
                statusCode: EnumRoleStatusCodeError.notFound,
                message: 'role.error.notFound',
            });
        }

        const updated = await this.roleRepository.update(id, data);
        return {
            data: this.roleUtil.mapOne(updated),
            metadataActivityLog: this.roleUtil.mapActivityLogMetadata(updated),
        };
    }

    async deleteByAdmin(id: string): Promise<IResponseReturn<void>> {
        const [role, roleUsed] = await Promise.all([
            this.roleRepository.existById(id),
            this.roleRepository.used(id),
        ]);

        if (!role) {
            throw new NotFoundException({
                statusCode: EnumRoleStatusCodeError.notFound,
                message: 'role.error.notFound',
            });
        } else if (roleUsed) {
            throw new ConflictException({
                statusCode: EnumRoleStatusCodeError.used,
                message: 'role.error.used',
            });
        }

        const deleted = await this.roleRepository.delete(id);

        return {
            metadataActivityLog: this.roleUtil.mapActivityLogMetadata(deleted),
        };
    }

    async validateRoleGuard(
        request: IRequestApp,
        requiredRoles: EnumRoleType[]
    ): Promise<RoleAbilityDto[]> {
        const { __user, user } = request;
        if (!__user || !user) {
            throw new ForbiddenException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const { role } = __user;

        if (role.type === EnumRoleType.superAdmin) {
            return [];
        } else if (requiredRoles.length === 0) {
            throw new InternalServerErrorException({
                statusCode: EnumRoleStatusCodeError.predefinedNotFound,
                message: 'role.error.predefinedNotFound',
            });
        } else if (!requiredRoles.includes(role.type)) {
            throw new ForbiddenException({
                statusCode: EnumRoleStatusCodeError.forbidden,
                message: 'role.error.forbidden',
            });
        }

        return this.roleUtil.mapOne(__user.role).abilities;
    }
}
