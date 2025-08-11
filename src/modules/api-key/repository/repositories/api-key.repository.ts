import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import { ApiKeyEntity } from '@modules/api-key/repository/entities/api-key.entity';
import { DatabaseRepositoryBase } from '@common/database/bases/database.repository';

@Injectable()
export class ApiKeyRepository extends DatabaseRepositoryBase<ApiKeyEntity> {
    constructor(
        @InjectDatabaseModel(ApiKeyEntity.name)
        private readonly apiKeyModel: Model<ApiKeyEntity>
    ) {
        super(apiKeyModel);
    }

    async findOneByObjectId(_id: string): Promise<ApiKeyEntity | null> {
        return this.findOne({ where: { _id: new Types.ObjectId(_id) } });
    }

    async findOneByKey(key: string): Promise<ApiKeyEntity | null> {
        return this.findOne({
            where: { key },
        });
    }
}
