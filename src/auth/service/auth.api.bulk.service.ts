/* istanbul ignore file */

import { Injectable } from '@nestjs/common';
import { DatabaseEntity } from 'src/database/database.decorator';
import { Model } from 'mongoose';
import { AuthApiDocument, AuthApiEntity } from '../schema/auth.api.schema';

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
