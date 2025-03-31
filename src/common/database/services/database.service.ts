import { Injectable } from '@nestjs/common';
import { IDatabaseService } from 'src/common/database/interfaces/database.service.interface';
import {
    DatabaseHelperQueryContain,
    InjectDatabaseConnection,
} from 'src/common/database/decorators/database.decorator';
import { ClientSession, Connection } from 'mongoose';

@Injectable()
export class DatabaseService implements IDatabaseService {
    constructor(
        @InjectDatabaseConnection()
        private readonly databaseConnection: Connection
    ) {}

    async createTransaction(): Promise<ClientSession> {
        const session: ClientSession =
            await this.databaseConnection.startSession();
        session.startTransaction();

        return session;
    }

    async commitTransaction(session: ClientSession): Promise<void> {
        await session.commitTransaction();
        await session.endSession();
    }

    async abortTransaction(session: ClientSession): Promise<void> {
        await session.abortTransaction();
        await session.endSession();
    }

    filterEqual<T = string>(
        field: string,
        filterValue: T
    ): Record<string, { $eq: T }> {
        return {
            [field]: {
                $eq: filterValue,
            },
        };
    }

    filterNotEqual<T = string>(
        field: string,
        filterValue: T
    ): Record<string, { $ne: T }> {
        return {
            [field]: {
                $ne: filterValue,
            },
        };
    }

    filterContain(field: string, filterValue: string): Record<string, any> {
        return DatabaseHelperQueryContain(field, filterValue);
    }

    filterContainFullMatch(
        field: string,
        filterValue: string
    ): Record<string, any> {
        return DatabaseHelperQueryContain(field, filterValue, {
            fullWord: true,
        });
    }

    filterIn<T = string>(
        field: string,
        filterValue: T[]
    ): Record<string, { $in: T[] }> {
        return {
            [field]: {
                $in: filterValue,
            },
        };
    }

    filterNin<T = string>(
        field: string,
        filterValue: T[]
    ): Record<
        string,
        {
            $nin: T[];
        }
    > {
        return {
            [field]: {
                $nin: filterValue,
            },
        };
    }

    filterDateBetween(
        fieldStart: string,
        fieldEnd: string,
        filterStartValue: Date,
        filterEndValue: Date
    ): Record<string, any> {
        if (fieldStart === fieldEnd) {
            return {
                [fieldStart]: {
                    $gte: filterStartValue,
                    $lte: filterEndValue,
                },
            };
        }

        return {
            [fieldStart]: {
                $gte: filterStartValue,
            },
            [fieldEnd]: {
                $lte: filterEndValue,
            },
        };
    }
}
