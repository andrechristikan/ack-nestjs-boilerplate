import {
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '@modules/role/enums/role.status-code.enum';
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
import { ENUM_ROLE_TYPE } from '@prisma/client';

@Injectable()
export class RoleService implements IRoleService {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly roleUtil: RoleUtil
    ) {}

    async getList(
        pagination: IPaginationQueryOffsetParams,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>> {
        const { data, ...others } =
            await this.roleRepository.findWithPagination(pagination, type);

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
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        return { data: this.roleUtil.mapOne(role) };
    }

    async create({
        name,
        ...others
    }: RoleCreateRequestDto): Promise<IResponseReturn<RoleDto>> {
        const exist = await this.roleRepository.existByName(name);
        if (exist) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.EXIST,
                message: 'role.error.exist',
            });
        }

        const created = await this.roleRepository.create({ name, ...others });
        return {
            data: this.roleUtil.mapOne(created),
            metadataActivityLog: this.roleUtil.mapActivityLogMetadata(created),
        };
    }

    async update(
        id: string,
        data: RoleUpdateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        const role = await this.roleRepository.existById(id);
        if (!role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        const updated = await this.roleRepository.update(id, data);
        return {
            data: this.roleUtil.mapOne(updated),
            metadataActivityLog: this.roleUtil.mapActivityLogMetadata(updated),
        };
    }

    async delete(id: string): Promise<IResponseReturn<void>> {
        const [role, roleUsed] = await Promise.all([
            this.roleRepository.existById(id),
            this.roleRepository.usedByUser(id),
        ]);

        if (!role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        } else if (roleUsed) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.USED,
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
        requiredRoles: ENUM_ROLE_TYPE[]
    ): Promise<RoleAbilityDto[]> {
        const { __user, user } = request;
        if (!__user || !user) {
            throw new ForbiddenException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const { role } = __user;

        if (role.type === ENUM_ROLE_TYPE.superAdmin) {
            return [];
        } else if (requiredRoles.length === 0) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.PREDEFINED_NOT_FOUND,
                message: 'role.error.predefinedNotFound',
            });
        } else if (!requiredRoles.includes(role.type)) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.FORBIDDEN,
                message: 'role.error.forbidden',
            });
        }

        return this.roleUtil.mapOne(__user.role).abilities;
    }
}
