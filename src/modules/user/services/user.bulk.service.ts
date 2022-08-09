import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DeleteResult } from 'mongodb';
import { UserDocument, UserEntity } from '../schemas/user.schema';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';

@Injectable()
export class UserBulkService {
    constructor(
        @DatabaseEntity(UserEntity.name)
        private readonly userModel: Model<UserDocument>
    ) {}

    async deleteMany(find: Record<string, any>): Promise<DeleteResult> {
        return this.userModel.deleteMany(find);
    }
}
