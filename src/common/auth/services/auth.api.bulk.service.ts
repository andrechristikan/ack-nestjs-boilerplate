import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { AuthApiDocument, AuthApiEntity } from '../schemas/auth.api.schema';
import { DeleteResult } from 'mongodb';

@Injectable()
export class AuthApiBulkService {
    constructor(
        @DatabaseEntity(AuthApiEntity.name)
        private readonly authApiModel: Model<AuthApiDocument>
    ) {}

    async deleteMany(find: Record<string, any>): Promise<DeleteResult> {
        return this.authApiModel.deleteMany(find);
    }
}
