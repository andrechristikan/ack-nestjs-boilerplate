import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from '@common/database/constants/database.constant';
import {
    VerificationEntity,
    VerificationSchema,
} from '@modules/verification/repository/entity/verification.entity';
import { VerificationRepository } from '@modules/verification/repository/repositories/verification.repository';

@Module({
    providers: [VerificationRepository],
    exports: [VerificationRepository],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: VerificationEntity.name,
                    schema: VerificationSchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class VerificationRepositoryModule {}
