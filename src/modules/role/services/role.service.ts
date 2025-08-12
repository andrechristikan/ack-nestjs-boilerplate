import {
    IDatabaseFilterOperation,
    IDatabaseFilterOperationComparison,
} from '@common/database/interfaces/database.interface';
import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleResponseDto } from '@modules/role/dtos/response/role.response.dto';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '@modules/role/enums/role.status-code.enum';
import { IRoleService } from '@modules/role/interfaces/role.service.interface';
import { RoleEntity } from '@modules/role/repository/entities/role.entity';
import { RoleRepository } from '@modules/role/repository/repositories/role.repository';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class RoleService implements IRoleService {
    constructor(private readonly roleRepository: RoleRepository) {}

    async getList(
        { search, limit, skip, order }: IPaginationQueryReturn,
        type?: Record<string, IDatabaseFilterOperation>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>> {
        const { items, ...others } =
            await this.roleRepository.findManyWithPagination({
                where: {
                    ...search,
                    ...type,
                },
                limit: limit,
                skip: skip,
                order: order,
            });

        const roles: RoleListResponseDto[] = this.mapList(items);

        return {
            data: roles,
            ...others,
        };
    }

    mapList(roles: RoleEntity[]): RoleListResponseDto[] {
        return plainToInstance(RoleListResponseDto, roles);
    }

    mapOne(role: RoleEntity): RoleResponseDto {
        return plainToInstance(RoleResponseDto, role);
    }

    async getOne(_id: string): Promise<RoleResponseDto> {
        const role: RoleEntity =
            await this.roleRepository.findOneByObjectId(_id);
        if (!role) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        return this.mapOne(role);
    }

    async create({
        name,
        ...others
    }: RoleCreateRequestDto): Promise<RoleResponseDto> {
        const exist = await this.roleRepository.existByName(name);
        if (exist) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.EXIST,
                message: 'role.error.exist',
            });
        }

        const create = await this.roleRepository.create({
            data: {
                name: name.toLowerCase(),
                ...others,
            },
        });

        const mapRole: RoleResponseDto = this.mapOne(create);
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

        return this.mapOne(update);
    }
}
