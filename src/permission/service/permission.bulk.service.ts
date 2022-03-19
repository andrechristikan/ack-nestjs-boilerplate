import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseEntity } from 'src/database/database.decorator';
import { IPermission } from '../permission.interface';
import { DeleteResult } from 'mongodb';
import {
    PermissionDocument,
    PermissionEntity,
} from '../schema/permission.schema';

@Injectable()
export class PermissionBulkService {
    constructor(
        @DatabaseEntity(PermissionEntity.name)
        private readonly permissionModel: Model<PermissionDocument>
    ) {}

    async createMany(data: IPermission[]): Promise<PermissionDocument[]> {
        return this.permissionModel.insertMany(
            data.map(({ isActive, code, description, name }) => ({
                code: code,
                name: name,
                description: description,
                isActive: isActive || true,
            }))
        );
    }

    async deleteMany(find: Record<string, any>): Promise<DeleteResult> {
        return this.permissionModel.deleteMany(find);
    }
}
