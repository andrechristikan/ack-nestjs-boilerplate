import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '@modules/role/enums/role.status-code.enum';
import { IRoleService } from '@modules/role/interfaces/role.service.interface';
import { RoleUtil } from '@modules/role/utils/role.util';
import {
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { ENUM_ROLE_TYPE, Role } from '@prisma/client';

@Injectable()
export class RoleService implements IRoleService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly roleUtil: RoleUtil
    ) {}

    async getList(
        { where, ...params }: IPaginationQueryOffsetParams,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>> {
        const { data, ...others } = await this.paginationService.offSet<Role>(
            this.databaseService.apiKey,
            {
                ...params,
                where: {
                    ...where,
                    ...type,
                },
            }
        );

        const roles: RoleListResponseDto[] = this.roleUtil.mapList(data);

        return {
            data: roles,
            ...others,
        };
    }

    async getOne(id: string): Promise<RoleDto> {
        const role = await this.databaseService.role.findUnique({
            where: { id },
        });
        if (!role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        return this.roleUtil.mapOne(role);
    }

    async create(data: RoleCreateRequestDto): Promise<RoleDto> {
        const { name, ...others } = this.roleUtil.serializeCreateDto(data);
        const exist = await this.databaseService.role.findFirst({
            where: { name },
        });
        if (exist) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.EXIST,
                message: 'role.error.exist',
            });
        }

        const create = await this.databaseService.role.create({
            data: { name, ...others },
        });

        const mapRole: RoleDto = this.roleUtil.mapOne(create);
        return mapRole;
    }

    async update(id: string, data: RoleUpdateRequestDto): Promise<RoleDto> {
        const role = await this.databaseService.role.findUnique({
            where: { id },
        });
        if (!role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        const serialize = this.roleUtil.serializeUpdateDto(data);
        const update = await this.databaseService.role.update({
            where: { id },
            data: serialize,
        });

        return this.roleUtil.mapOne(update);
    }

    async delete(id: string): Promise<void> {
        const role = await this.databaseService.role.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        const roleUsed = await this.databaseService.user.findFirst({
            where: { roleId: id },
            select: { id: true },
        });
        if (roleUsed) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.USED,
                message: 'role.error.used',
            });
        }

        await this.databaseService.role.delete({
            where: { id },
        });

        return;
    }

    async validateRoleGuard(
        request: IRequestApp,
        roles: ENUM_ROLE_TYPE[]
    ): Promise<RoleAbilityDto[]> {
        const { __user, user } = request;
        if (!__user || !user) {
            throw new ForbiddenException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const { type } = user;

        if (type === ENUM_ROLE_TYPE.SUPER_ADMIN) {
            return [];
        } else if (roles.length === 0) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.PREDEFINED_NOT_FOUND,
                message: 'role.error.predefinedNotFound',
            });
        } else if (!roles.includes(type)) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.FORBIDDEN,
                message: 'role.error.forbidden',
            });
        }

        return this.roleUtil.mapOne(__user.role).abilities;
    }
}
