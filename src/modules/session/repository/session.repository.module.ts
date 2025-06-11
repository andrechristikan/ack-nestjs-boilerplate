import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from '@common/database/constants/database.constant';
import {
    SessionEntity,
    SessionSchema,
} from '@modules/session/repository/entities/session.entity';
import { SessionRepository } from '@modules/session/repository/repositories/session.repository';

@Module({
    providers: [SessionRepository],
    exports: [SessionRepository],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: SessionEntity.name,
                    schema: SessionSchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class SessionRepositoryModule {}
