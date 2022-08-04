import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { DeleteResult } from 'mongodb';
import { RoleDocument, RoleEntity } from '../schemas/role.schema';
import { RoleCreateDto } from '../dtos/role.create.dto';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';

@Injectable()
export class RoleBulkService {
    constructor(
        @DatabaseEntity(RoleEntity.name)
        private readonly roleModel: Model<RoleDocument>
    ) {}

    async deleteMany(find: Record<string, any>): Promise<DeleteResult> {
        return await this.roleModel.deleteMany(find);
    }

    async createMany(data: RoleCreateDto[]): Promise<RoleDocument[]> {
        return this.roleModel.insertMany(
            data.map(({ name, permissions, accessFor, isActive }) => ({
                name,
                isActive: isActive || true,
                accessFor,
                permissions: permissions.map((val) => new Types.ObjectId(val)),
            }))
        );
    }
}
