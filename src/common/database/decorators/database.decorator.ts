import { Inject } from '@nestjs/common';
import { InjectConnection, InjectModel, Schema } from '@nestjs/mongoose';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
    DATABASE_CONNECTION_NAME,
    DATABASE_CREATED_AT_FIELD_NAME,
    DATABASE_UPDATED_AT_FIELD_NAME,
} from 'src/common/database/constants/database.constant';
import { Entity } from 'typeorm';

export function DatabaseRepository(name: string): ParameterDecorator {
    return Inject(name);
}

// mongo
export function DatabaseMongoConnection(
    connectionName?: string
): ParameterDecorator {
    return InjectConnection(connectionName || DATABASE_CONNECTION_NAME);
}

export function DatabaseMongoModel(
    name: string,
    connectionName?: string
): ParameterDecorator {
    return InjectModel(name, connectionName || DATABASE_CONNECTION_NAME);
}

export function DatabaseMongoSchema(): ClassDecorator {
    return Schema({
        versionKey: false,
        timestamps: {
            createdAt: DATABASE_CREATED_AT_FIELD_NAME,
            updatedAt: DATABASE_UPDATED_AT_FIELD_NAME,
        },
    });
}

// postgres

export function DatabasePostgresModel(
    entity: any,
    connectionName?: string
): ParameterDecorator {
    return InjectRepository(entity, connectionName || DATABASE_CONNECTION_NAME);
}

export function DatabasePostgresConnection(
    connectionName?: string
): ParameterDecorator {
    return InjectDataSource(connectionName || DATABASE_CONNECTION_NAME);
}

export function DatabasePostgresSchema(name: string): ClassDecorator {
    return Entity({
        name,
    });
}
