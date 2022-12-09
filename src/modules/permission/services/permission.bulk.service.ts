import { Injectable } from '@nestjs/common';
import {
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { IPermissionBulkService } from 'src/modules/permission/interfaces/permission.bulk-service.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { PermissionRepository } from 'src/modules/permission/repository/repositories/permission.repository';

@Injectable()
export class PermissionBulkService implements IPermissionBulkService {
    constructor(private readonly permissionRepository: PermissionRepository) {}

    async createMany(
        data: PermissionEntity[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        return this.permissionRepository.createMany<PermissionEntity>(
            data,
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
