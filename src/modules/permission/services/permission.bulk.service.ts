import { Injectable } from '@nestjs/common';
import {
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { IPermissionBulkService } from 'src/modules/permission/interfaces/permission.bulk-service.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { PermissionRepository } from 'src/modules/permission/repository/repositories/permission.repository';
import { PermissionUseCase } from 'src/modules/permission/use-cases/permission.use-case';

@Injectable()
export class PermissionBulkService implements IPermissionBulkService {
    constructor(
        private readonly permissionRepository: PermissionRepository,
        private readonly permissionUseCase: PermissionUseCase
    ) {}

    async createMany(
        data: PermissionCreateDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        const maps: Promise<PermissionEntity>[] = data.map((value) =>
            this.permissionUseCase.create(value)
        );

        const create: PermissionEntity[] = await Promise.all(maps);
        return this.permissionRepository.createMany<PermissionEntity>(
            create,
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
