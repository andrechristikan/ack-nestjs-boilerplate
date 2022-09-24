import { Injectable } from '@nestjs/common';
import { IAuthPermission } from 'src/common/auth/interfaces/auth.interface';
import { IDatabaseOptions } from 'src/common/database/interfaces/database.interface';
import { IPermissionBulkService } from 'src/modules/permission/interfaces/permission.bulk-service.interface';
import { PermissionBulkRepository } from 'src/modules/permission/repositories/permission.bulk.repository';
import { PermissionEntity } from 'src/modules/permission/schemas/permission.schema';

@Injectable()
export class PermissionBulkService implements IPermissionBulkService {
    constructor(
        private readonly permissionBulkRepository: PermissionBulkRepository
    ) {}

    async createMany(
        data: IAuthPermission[],
        options?: IDatabaseOptions
    ): Promise<boolean> {
        const map: PermissionEntity[] = data.map(
            ({ isActive, code, description, name }) => ({
                code: code,
                name: name,
                description: description,
                isActive: isActive || true,
            })
        );

        return this.permissionBulkRepository.createMany<PermissionEntity>(
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
