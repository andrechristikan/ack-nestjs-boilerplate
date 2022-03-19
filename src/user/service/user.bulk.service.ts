import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseEntity } from 'src/database/database.decorator';
import { DeleteResult } from 'mongodb';
import { UserDocument, UserEntity } from '../schema/user.schema';

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
