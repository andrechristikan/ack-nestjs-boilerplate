import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationIn,
    IPaginationQueryOffsetParams,
    IPaginationQueryReturn,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleResponseDto } from '@modules/role/dtos/response/role.response.dto';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '@modules/role/enums/role.status-code.enum';
import { IRoleService } from '@modules/role/interfaces/role.service.interface';
import { RoleUtil } from '@modules/role/utils/role.util';
import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

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

    async create(data: RoleCreateRequestDto): Promise<RoleResponseDto> {
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

        const mapRole: RoleResponseDto = this.roleUtil.mapOne(create);
        return mapRole;
    }

    async update(
        _id: string,
        { permissions, type, description }: RoleUpdateRequestDto
    ): Promise<RoleResponseDto> {
        const role = await this.roleRepository.findOneByObjectId(_id);
        if (!role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        const update = await this.roleRepository.update({
            where: { _id: role._id },
            data: { permissions, type, description },
        });

        return this.roleUtil.mapOne(update);
    }
}
