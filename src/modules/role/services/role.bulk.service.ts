import { Injectable } from '@nestjs/common';
import {
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { IRoleBulkService } from 'src/modules/role/interfaces/role.bulk-service.interface';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { RoleRepository } from 'src/modules/role/repository/repositories/role.repository';

@Injectable()
export class RoleBulkService implements IRoleBulkService {
    constructor(private readonly roleRepository: RoleRepository) {}

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.roleRepository.deleteMany(find, options);
    }

    async createMany(
        data: RoleEntity[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        return this.roleRepository.createMany<RoleEntity>(data, options);
    }
}
