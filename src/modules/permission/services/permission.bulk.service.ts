import { Injectable } from '@nestjs/common';
import { DatabaseRepository } from 'src/common/database/decorators/database.decorator';
import {
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { IPermissionBulkService } from 'src/modules/permission/interfaces/permission.bulk-service.interface';
import {
    PermissionEntity,
    PermissionRepository,
} from 'src/modules/permission/repository/entities/permission.entity';

@Injectable()
export class PermissionBulkService implements IPermissionBulkService {
    constructor(
        @DatabaseRepository(PermissionRepository)
        private readonly permissionRepository: IDatabaseRepository<PermissionEntity>
    ) {}

    async createMany(
        data: PermissionCreateDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        const map: PermissionEntity[] = data.map(
            ({ code, description, name }) => {
                const create = new PermissionEntity();
                create.code = code;
                create.name = name;
                create.description = description;
                create.isActive = true;

                return create;
            }
        );

        return this.permissionRepository.createMany<PermissionEntity>(
            map,
            options
        );
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.permissionRepository.deleteMany(find, options);
    }
}
