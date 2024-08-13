import {
    IDatabaseCreateManyOptions,
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import { RoleCreateRequestDto } from 'src/modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from 'src/modules/role/dtos/request/role.update.request.dto';
import { RoleGetResponseDto } from 'src/modules/role/dtos/response/role.get.response.dto';
import { RoleListResponseDto } from 'src/modules/role/dtos/response/role.list.response.dto';
import { RoleShortResponseDto } from 'src/modules/role/dtos/response/role.short.response.dto';
import {
    RoleDoc,
    RoleEntity,
} from 'src/modules/role/repository/entities/role.entity';

export interface IRoleService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleDoc[]>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findAllActive(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleDoc[]>;
    getTotalActive(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findOneById(_id: string, options?: IDatabaseOptions): Promise<RoleDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<RoleDoc>;
    findOneByName(name: string, options?: IDatabaseOptions): Promise<RoleDoc>;
    findOneActiveById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<RoleDoc>;
    existByName(
        name: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean>;
    create(
        { name, description, type, permissions }: RoleCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<RoleDoc>;
    update(
        repository: RoleDoc,
        { permissions, type, description }: RoleUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<RoleDoc>;
    active(
        repository: RoleDoc,
        options?: IDatabaseSaveOptions
    ): Promise<RoleDoc>;
    inactive(
        repository: RoleDoc,
        options?: IDatabaseSaveOptions
    ): Promise<RoleDoc>;
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
    createMany(
        data: RoleCreateRequestDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean>;
    mapList(roles: RoleDoc[] | RoleEntity[]): Promise<RoleListResponseDto[]>;
    mapGet(role: RoleDoc | RoleEntity): Promise<RoleGetResponseDto>;
    mapShort(roles: RoleDoc[] | RoleEntity[]): Promise<RoleShortResponseDto[]>;
}
