import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DatabaseEntity } from 'src/common/database/database.decorator';
import { IDatabaseFindAllOptions } from 'src/common/database/database.interface';
import { PermissionCreateDto } from '../dtos/permission.create.dto';
import { PermissionUpdateDto } from '../dtos/permission.update.dto';
import {
    PermissionDocument,
    PermissionEntity,
} from '../schemas/permission.schema';
import { PermissionGetSerialization } from '../serializations/permission.get.serialization';
import { PermissionListSerialization } from '../serializations/permission.list.serialization';

@Injectable()
export class PermissionService {
    constructor(
        @DatabaseEntity(PermissionEntity.name)
        private readonly permissionModel: Model<PermissionDocument>
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<PermissionDocument[]> {
        const findAll = this.permissionModel.find(find);
        if (
            options &&
            options.limit !== undefined &&
            options.skip !== undefined
        ) {
            findAll.limit(options.limit).skip(options.skip);
        }

        if (options && options.sort) {
            findAll.sort(options.sort);
        }

        return findAll.lean();
    }

    async findOneById(_id: string): Promise<PermissionDocument> {
        return this.permissionModel.findById(_id).lean();
    }

    async findOne(find?: Record<string, any>): Promise<PermissionDocument> {
        return this.permissionModel.findOne(find).lean();
    }

    async getTotal(find?: Record<string, any>): Promise<number> {
        return this.permissionModel.countDocuments(find);
    }

    async deleteOne(find: Record<string, any>): Promise<PermissionDocument> {
        return this.permissionModel.findOneAndDelete(find);
    }

    async create(data: PermissionCreateDto): Promise<PermissionDocument> {
        const create: PermissionDocument = new this.permissionModel({
            name: data.name,
            code: data.code,
            description: data.description,
            isActive: data.isActive || true,
        });

        return create.save();
    }

    async update(
        _id: string,
        { name, description }: PermissionUpdateDto
    ): Promise<PermissionDocument> {
        const permission = await this.permissionModel.findById(_id);

        permission.name = name;
        permission.description = description;
        return permission.save();
    }

    async serializationGet(
        data: PermissionDocument
    ): Promise<PermissionGetSerialization> {
        return plainToInstance(PermissionGetSerialization, data);
    }

    async serializationList(
        data: PermissionDocument[]
    ): Promise<PermissionListSerialization[]> {
        return plainToInstance(PermissionListSerialization, data);
    }

    async inactive(_id: string): Promise<PermissionDocument> {
        const permission: PermissionDocument =
            await this.permissionModel.findById(_id);

        permission.isActive = false;
        return permission.save();
    }

    async active(_id: string): Promise<PermissionDocument> {
        const permission: PermissionDocument =
            await this.permissionModel.findById(_id);

        permission.isActive = true;
        return permission.save();
    }
}
