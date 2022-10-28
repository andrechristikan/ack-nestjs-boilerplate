import { Injectable } from '@nestjs/common';
import { ClientSession, Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum.constant';
import {
    IDatabaseConnection,
    IDatabaseSession,
} from 'src/common/database/interfaces/database.interface';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class DatabaseService {
    private readonly databaseType: ENUM_DATABASE_TYPE;

    constructor(private readonly configService: ConfigService) {
        this.databaseType =
            this.configService.get<ENUM_DATABASE_TYPE>('database.type');
    }

    createdId(): string {
        return uuidV4();
    }

    async createTransactionSession(
        connection: IDatabaseConnection
    ): Promise<IDatabaseSession> {
        if (this.databaseType === ENUM_DATABASE_TYPE.MONGO) {
            const c = connection as Connection;
            return c.startSession();
        }

        const c = connection as DataSource;
        return c.createQueryRunner();
    }

    async startTransaction(session: IDatabaseSession): Promise<void> {
        return session.startTransaction();
    }

    async commitTransaction(session: IDatabaseSession): Promise<void> {
        await session.commitTransaction();
        return;
    }

    async rollbackTransaction(session: IDatabaseSession): Promise<void> {
        if (this.databaseType === ENUM_DATABASE_TYPE.MONGO) {
            const c = session as ClientSession;
            c.abortTransaction();

            return;
        }

        const c = session as QueryRunner;
        await c.rollbackTransaction();

        return;
    }

    async endTransactionSession(session: IDatabaseSession): Promise<void> {
        if (this.databaseType === ENUM_DATABASE_TYPE.MONGO) {
            const c = session as ClientSession;
            c.endSession();

            return;
        }

        const c = session as QueryRunner;
        await c.release();

        return;
    }
}
