import { Injectable } from '@nestjs/common';
import {
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { IPermissionBulkService } from 'src/modules/permission/interfaces/permission.bulk-service.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { PermissionRepository } from 'src/modules/permission/repository/repositories/permission.repository';

@Injectable()
export class PermissionBulkService implements IPermissionBulkService {
    constructor(private readonly permissionRepository: PermissionRepository) {}

    async createMany(
        data: PermissionCreateDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        const map: PermissionEntity[] = data.map(
            ({ code, description, group }) => {
                const create = new PermissionEntity();
                create.code = code;
                create.description = description;
                create.group = group;
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
