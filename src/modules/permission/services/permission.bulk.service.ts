import { Injectable } from '@nestjs/common';
import { IAuthPermission } from 'src/common/auth/interfaces/auth.interface';
import { IDatabaseOptions } from 'src/common/database/interfaces/database.interface';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { IPermissionBulkService } from 'src/modules/permission/interfaces/permission.bulk-service.interface';
import { PermissionBulkRepository } from 'src/modules/permission/repositories/permission.bulk.repository';

@Injectable()
export class PermissionBulkService implements IPermissionBulkService {
    constructor(
        private readonly permissionBulkRepository: PermissionBulkRepository
    ) {}

    async createMany(
        data: IAuthPermission[],
        options?: IDatabaseOptions
    ): Promise<boolean> {
        const map: PermissionCreateDto[] = data.map(
            ({ isActive, code, description, name }) => ({
                code: code,
                name: name,
                description: description,
                isActive: isActive || true,
            })
        );

        return this.permissionBulkRepository.createMany<IAuthPermission>(
            map,
            options
        );
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<boolean> {
        return this.permissionBulkRepository.deleteMany(find, options);
    }
}
