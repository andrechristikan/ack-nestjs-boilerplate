import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import { RoleEntity } from '@modules/role/repository/entities/role.entity';
import { DatabaseRepositoryBase } from '@common/database/bases/database.repository';
import { IDatabaseExistReturn } from '@common/database/interfaces/database.interface';

@Injectable()
export class RoleRepository extends DatabaseRepositoryBase<RoleEntity> {
    constructor(
        @InjectDatabaseModel(RoleEntity.name)
        private readonly roleModel: Model<RoleEntity>
    ) {
        super(roleModel);
    }

    async findOneByObjectId(_id: string): Promise<RoleEntity | null> {
        return this.findOneById({
            where: {
                _id: new Types.ObjectId(_id),
            },
        });
    }

    async existByName(name: string): Promise<IDatabaseExistReturn | null> {
        return this.exists({
            where: { name },
        });
    }

    async findOneByName(name: string): Promise<RoleEntity | null> {
        return this.findOne({
            where: { name },
        });
    }
}
