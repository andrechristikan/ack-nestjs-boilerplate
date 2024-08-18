import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    PasswordHistoryEntity,
    PasswordHistorySchema,
} from 'src/modules/password-history/repository/entities/password-history.entity';
import { PasswordHistoryRepository } from 'src/modules/password-history/repository/repositories/password-history.repository';

@Module({
    providers: [PasswordHistoryRepository],
    exports: [PasswordHistoryRepository],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: PasswordHistoryEntity.name,
                    schema: PasswordHistorySchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class PasswordHistoryRepositoryModule {}
