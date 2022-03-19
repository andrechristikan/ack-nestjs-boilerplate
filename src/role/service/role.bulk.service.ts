import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { DatabaseEntity } from 'src/database/database.decorator';
import { DeleteResult } from 'mongodb';
import RoleCreateValidation from '../validation/role.create.validation';
import { RoleDocument, RoleEntity } from '../schema/role.schema';

@Injectable()
export class RoleBulkService {
    constructor(
        @DatabaseEntity(RoleEntity.name)
        private readonly roleModel: Model<RoleDocument>
    ) {}

    async deleteMany(find: Record<string, any>): Promise<DeleteResult> {
        return await this.roleModel.deleteMany(find);
    }

    async createMany(data: RoleCreateValidation[]): Promise<RoleDocument[]> {
        return this.roleModel.insertMany(
            data.map(({ name, permissions, isAdmin }) => ({
                name,
                isActive: true,
                isAdmin: isAdmin || false,
                permissions: permissions.map((val) => new Types.ObjectId(val)),
            }))
        );
    }
}
