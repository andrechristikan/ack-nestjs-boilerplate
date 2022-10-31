import { Inject } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum.constant';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';

// for load env
import 'dotenv/config';

export function DatabaseConnection(
    connectionName?: string
): ParameterDecorator {
    return process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
        ? InjectConnection(connectionName || DATABASE_CONNECTION_NAME)
        : InjectDataSource(connectionName || DATABASE_CONNECTION_NAME);
}

export function DatabaseModel(
    entity: any,
    connectionName?: string
): ParameterDecorator {
    return process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
        ? InjectModel(entity, connectionName || DATABASE_CONNECTION_NAME)
        : InjectRepository(entity, connectionName || DATABASE_CONNECTION_NAME);
}

export function DatabaseRepository(repositoryName: string): ParameterDecorator {
    return Inject(repositoryName);
}
