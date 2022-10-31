import { Injectable } from '@nestjs/common';
import { ClientSession, Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum.constant';
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

    async createTransactionSession<T, N>(connection: T): Promise<N> {
        if (this.databaseType === ENUM_DATABASE_TYPE.MONGO) {
            const c = connection as Connection;
            return c.startSession() as N;
        }

        const c = connection as DataSource;
        return c.createQueryRunner() as N;
    }

    async startTransaction<T>(
        session: T & { startTransaction: any }
    ): Promise<void> {
        return session.startTransaction();
    }

    async runTransaction<T>(session: T, operation: any): Promise<void> {
        if (this.databaseType === ENUM_DATABASE_TYPE.MONGO) {
            await operation;

            return;
        }

        const s = session as QueryRunner;
        await s.manager.save(operation, { transaction: true });

        return;
    }

    async commitTransaction<T>(
        session: T & { commitTransaction: any }
    ): Promise<void> {
        await session.commitTransaction();
        return;
    }

    async rollbackTransaction<T>(session: T): Promise<void> {
        if (this.databaseType === ENUM_DATABASE_TYPE.MONGO) {
            const c = session as ClientSession;
            c.abortTransaction();

            return;
        }

        const c = session as QueryRunner;
        await c.rollbackTransaction();

        return;
    }

    async endTransactionSession<T>(session: T): Promise<void> {
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
