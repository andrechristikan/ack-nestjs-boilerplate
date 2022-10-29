import { Injectable } from '@nestjs/common';
import {
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { IRoleBulkService } from 'src/modules/role/interfaces/role.bulk-service.interface';
import { RoleRepository } from 'src/modules/role/repositories/role.repository';
import { RoleEntity } from 'src/modules/role/schemas/role.schema';

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
        data: RoleCreateDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        const create: RoleEntity[] = data.map((val) => {
            const r = new RoleEntity();
            r.name = val.name;
            r.accessFor = val.accessFor;
            r.permissions = val.permissions;
            r.isActive = true;

            return r;
        });
        return this.roleRepository.createMany<RoleEntity>(create, options);
    }
}
