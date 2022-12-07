import { Injectable } from '@nestjs/common';
import {
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { PermissionUseCase } from 'src/modules/permission/use-cases/permission.use-case';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { IRoleBulkService } from 'src/modules/role/interfaces/role.bulk-service.interface';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { RoleRepository } from 'src/modules/role/repository/repositories/role.repository';
import { RoleUseCase } from 'src/modules/role/use-cases/role.use-case';

@Injectable()
export class RoleBulkService implements IRoleBulkService {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly roleUseCase: RoleUseCase
    ) {}

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.roleRepository.deleteMany(find, options);
    }

    async createMany(
        data: RoleCreateDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        const map: Promise<RoleEntity>[] = data.map((val) =>
            this.roleUseCase.create(val)
        );
        const create: RoleEntity[] = await Promise.all(map);

        return this.roleRepository.createMany<RoleEntity>(create, options);
    }
}
