import { Injectable } from '@nestjs/common';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import mongoose, { ClientSession, Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { IDatabaseOptionsService } from 'src/common/database/interfaces/database.options-service.interface';
import qs from 'qs';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum.constant';
import {
    DatabaseConnectionType,
    DatabaseSessionType,
} from 'src/common/database/interfaces/database.interface';

@Injectable()
export class DatabaseTransactionService {
    async createSession(
        connection: DatabaseConnectionType
    ): Promise<DatabaseSessionType> {
        if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
            const c = connection as Connection;
            return c.startSession();
        }

        const c = connection as DataSource;
        return c.createQueryRunner();
    }

    async startTransaction(session: DatabaseSessionType): Promise<void> {
        return session.startTransaction();
    }

    async commitTransaction(session: DatabaseSessionType): Promise<void> {
        await session.commitTransaction();
        return;
    }

    async rollbackTransaction(session: DatabaseSessionType): Promise<void> {
        if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
            const c = session as ClientSession;
            c.abortTransaction();

            return;
        }

        const c = session as QueryRunner;
        await c.rollbackTransaction();

        return;
    }

    async endTransaction(session: DatabaseSessionType): Promise<void> {
        if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
            const c = session as ClientSession;
            c.endSession();

            return;
        }

        const c = session as QueryRunner;
        await c.release();

        return;
    }
}
