import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { DeleteResult } from 'mongodb';
import {
    AuthApiDocument,
    AuthApiEntity,
} from 'src/common/auth/schemas/auth.api.schema';

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
