import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
    IDatabaseCreateOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseManyOptions,
    IDatabaseCreateManyOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_POLICY_ROLE_TYPE } from 'src/common/policy/constants/policy.enum.constant';
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
        return this.roleRepository.findAll<RoleDoc>(find, options);
    }

    async findAllActive(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleDoc[]> {
        return this.roleRepository.findAll<RoleDoc>(
            { ...find, isActive: true },
            options
        );
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.roleRepository.getTotal(find, options);
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

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleDoc> {
        return this.roleRepository.findOneById<RoleDoc>(_id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleDoc> {
        return this.roleRepository.findOne<RoleDoc>(find, options);
    }

    async findOneByName(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleDoc> {
        return this.roleRepository.findOne<RoleDoc>({ name }, options);
    }

    async findOneActiveById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleDoc> {
        return this.roleRepository.findOne<RoleDoc>(
            { _id, isActive: true },
            options
        );
    }

    async findOneActiveByIdAndType(
        _id: string,
        type: ENUM_POLICY_ROLE_TYPE,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleDoc> {
        return this.roleRepository.findOne<RoleDoc>(
            { type, _id, isActive: true },
            options
        );
    }

    async existByName(
        name: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean> {
        return this.roleRepository.exists(
            {
                name,
            },
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
        options?: IDatabaseSaveOptions
    ): Promise<RoleDoc> {
        return this.roleRepository.delete(repository, options);
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.roleRepository.deleteMany(find, options);
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
        });
        return this.roleRepository.createMany<RoleEntity>(create, options);
    }

    async mapList(roles: RoleDoc[]): Promise<RoleListResponseDto[]> {
        const plainObject: RoleEntity[] = roles.map(e => e.toObject());

        return plainToInstance(RoleListResponseDto, plainObject);
    }

    async mapGet(role: RoleDoc): Promise<RoleGetResponseDto> {
        return plainToInstance(RoleGetResponseDto, role.toObject());
    }

    async mapShort(roles: RoleDoc[]): Promise<RoleShortResponseDto[]> {
        const plainObject: RoleEntity[] = roles.map(e => e.toObject());
        return plainToInstance(RoleShortResponseDto, plainObject);
    }
}
