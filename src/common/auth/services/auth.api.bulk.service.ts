/* istanbul ignore file */

import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseEntity } from 'src/common/database/database.decorator';
import { AuthApiDocument, AuthApiEntity } from '../schemas/auth.api.schema';

@Injectable()
export class AuthApiBulkService {
    constructor(
        @DatabaseEntity(AuthApiEntity.name)
        private readonly authApiModel: Model<AuthApiDocument>
    ) {}

    async deleteMany(find: Record<string, any>) {
        return this.authApiModel.deleteMany(find);
    }
}
