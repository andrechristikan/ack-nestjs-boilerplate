import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from '@common/database/constants/database.constant';
import {
    ResetPasswordEntity,
    ResetPasswordSchema,
} from '@module/reset-password/repository/entities/reset-password.entity';
import { ResetPasswordRepository } from '@module/reset-password/repository/repositories/reset-password.repository';

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
