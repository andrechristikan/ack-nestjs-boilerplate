import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    ResetPasswordEntity,
    ResetPasswordSchema,
} from 'src/modules/reset-password/repository/entities/reset-password.entity';
import { ResetPasswordRepository } from 'src/modules/reset-password/repository/repositories/reset-password.repository';

@Module({
    providers: [ResetPasswordRepository],
    exports: [ResetPasswordRepository],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: ResetPasswordEntity.name,
                    schema: ResetPasswordSchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class ResetPasswordRepositoryModule {}
