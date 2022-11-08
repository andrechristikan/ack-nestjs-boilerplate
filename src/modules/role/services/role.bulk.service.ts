import { Injectable } from '@nestjs/common';
import { DatabaseRepository } from 'src/common/database/decorators/database.decorator';
import {
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { IRoleBulkService } from 'src/modules/role/interfaces/role.bulk-service.interface';
import {
    RoleEntity,
    RoleRepository,
} from 'src/modules/role/repository/entities/role.entity';

@Injectable()
export class RoleBulkService implements IRoleBulkService {
    constructor(
        @DatabaseRepository(RoleRepository)
        private readonly roleRepository: IDatabaseRepository<RoleEntity>
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
