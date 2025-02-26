import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Document } from 'mongoose';
import { DatabaseHelperQueryContain } from 'src/common/database/decorators/database.decorator';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseCreateManyOptions,
    IDatabaseSaveOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindOneOptions,
    IDatabaseExistsOptions,
    IDatabaseDeleteOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { RoleCreateRequestDto } from 'src/modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from 'src/modules/role/dtos/request/role.update.request.dto';
import { RoleGetResponseDto } from 'src/modules/role/dtos/response/role.get.response.dto';
import { RoleListResponseDto } from 'src/modules/role/dtos/response/role.list.response.dto';
import { RoleShortResponseDto } from 'src/modules/role/dtos/response/role.short.response.dto';
import { IRoleService } from 'src/modules/role/interfaces/role.service.interface';
import {
    RoleDoc,
    RoleEntity,
} from 'src/modules/role/repository/entities/role.entity';
import { RoleRepository } from 'src/modules/role/repository/repositories/role.repository';

@Injectable()
export class RoleService implements IRoleService {
    constructor(private readonly roleRepository: RoleRepository) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleDoc[]> {
        return this.roleRepository.findAll(find, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.roleRepository.getTotal(find, options);
    }

    async findAllActive(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleDoc[]> {
        return this.roleRepository.findAll(
            { ...find, isActive: true },
            options
        );
    }

    async getTotalActive(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.roleRepository.getTotal(
            { ...find, isActive: true },
            options
        );
    }

    async findAllActiveByType(
        type: ENUM_POLICY_ROLE_TYPE,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleDoc[]> {
        return this.roleRepository.findAll({ type, isActive: true }, options);
    }

    async findAllByTypes(
        types: ENUM_POLICY_ROLE_TYPE[],
        options?: IDatabaseFindAllOptions
    ): Promise<RoleDoc[]> {
        return this.roleRepository.findAll(
            {
                type: {
                    $in: types,
                },
            },
            options
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleDoc> {
        return this.roleRepository.findOneById(_id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleDoc> {
        return this.roleRepository.findOne(find, options);
    }

    async findOneByName(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleDoc> {
        return this.roleRepository.findOne(
            DatabaseHelperQueryContain('name', name, { fullWord: true }),
            options
        );
    }

    async findOneActiveById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleDoc> {
        return this.roleRepository.findOne({ _id, isActive: true }, options);
    }

    async existByName(
        name: string,
        options?: IDatabaseExistsOptions
    ): Promise<boolean> {
        return this.roleRepository.exists(
            DatabaseHelperQueryContain('name', name, { fullWord: true }),
            options
        );
    }

    async create(
        { name, description, type, permissions }: RoleCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<RoleDoc> {
        const create: RoleEntity = new RoleEntity();
        create.name = name;
        create.description = description;
        create.type = type;
        create.permissions = permissions;
        create.isActive = true;

        return this.roleRepository.create<RoleEntity>(create, options);
    }

    async update(
        repository: RoleDoc,
        { permissions, type, description }: RoleUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<RoleDoc> {
        repository.description = description;
        repository.type = type;
        repository.permissions = permissions;

        return this.roleRepository.save(repository, options);
    }

    async active(
        repository: RoleDoc,
        options?: IDatabaseSaveOptions
    ): Promise<RoleDoc> {
        repository.isActive = true;

        return this.roleRepository.save(repository, options);
    }

    async inactive(
        repository: RoleDoc,
        options?: IDatabaseSaveOptions
    ): Promise<RoleDoc> {
        repository.isActive = false;

        return this.roleRepository.save(repository, options);
    }

    async delete(
        repository: RoleDoc,
        options?: IDatabaseDeleteOptions
    ): Promise<boolean> {
        await this.roleRepository.delete(repository, options);

        return true;
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        await this.roleRepository.deleteMany(find, options);

        return true;
    }

    async createMany(
        data: RoleCreateRequestDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        const create: RoleEntity[] = data.map(({ type, name, permissions }) => {
            const entity: RoleEntity = new RoleEntity();
            entity.type = type;
            entity.isActive = true;
            entity.name = name;
            entity.permissions = permissions;

            return entity;
        }) as RoleEntity[];

        await this.roleRepository.createMany<RoleEntity>(create, options);

        return true;
    }

    mapList(roles: RoleDoc[] | RoleEntity[]): RoleListResponseDto[] {
        return plainToInstance(
            RoleListResponseDto,
            roles.map((e: RoleDoc | RoleEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }

    mapGet(role: RoleDoc | RoleEntity): RoleGetResponseDto {
        return plainToInstance(
            RoleGetResponseDto,
            role instanceof Document ? role.toObject() : role
        );
    }

    mapShort(roles: RoleDoc[] | RoleEntity[]): RoleShortResponseDto[] {
        return plainToInstance(
            RoleShortResponseDto,
            roles.map((e: RoleDoc | RoleEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }
}
