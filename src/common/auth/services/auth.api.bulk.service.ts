import { Injectable } from '@nestjs/common';
import { IDatabaseManyOptions } from 'src/common/database/interfaces/database.interface';
import { IAuthApiBulkService } from 'src/common/auth/interfaces/auth.api.bulk-service.interface';
import { AuthApiBulkRepository } from 'src/common/auth/repositories/auth.api.bulk.repository';

@Injectable()
export class AuthApiBulkService implements IAuthApiBulkService {
    constructor(
        private readonly authApiBulkRepository: AuthApiBulkRepository
    ) {}

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.authApiBulkRepository.deleteMany(find, options);
    }
}
