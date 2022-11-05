import { Inject } from '@nestjs/common';
import {
    InjectConnection,
    InjectModel,
    Schema,
    SchemaOptions,
} from '@nestjs/mongoose';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
    DATABASE_CONNECTION_NAME,
    DATABASE_CREATED_AT_FIELD_NAME,
    DATABASE_UPDATED_AT_FIELD_NAME,
} from 'src/common/database/constants/database.constant';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum';
import { Entity, EntityOptions } from 'typeorm';

export function DatabaseRepository(name: string): ParameterDecorator {
    return Inject(name);
}

// TODO database connection dynamic and support transaction

export function DatabaseConnection(connectionName?: string) {
    return process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
        ? InjectConnection(connectionName || DATABASE_CONNECTION_NAME)
        : InjectDataSource(connectionName || DATABASE_CONNECTION_NAME);
}

// mongo
export function DatabaseMongoConnection(
    connectionName?: string
): ParameterDecorator {
    return InjectConnection(connectionName || DATABASE_CONNECTION_NAME);
}

export function DatabaseMongoModel(
    entity: any,
    connectionName?: string
): ParameterDecorator {
    return InjectModel(entity.name, connectionName || DATABASE_CONNECTION_NAME);
}

export function DatabaseMongoSchema(options?: SchemaOptions): ClassDecorator {
    return Schema({
        ...options,
        versionKey: false,
        timestamps: {
            createdAt: DATABASE_CREATED_AT_FIELD_NAME,
            updatedAt: DATABASE_UPDATED_AT_FIELD_NAME,
        },
    });
}

// postgres
export function DatabasePostgresConnection(
    connectionName?: string
): ParameterDecorator {
    return InjectDataSource(connectionName || DATABASE_CONNECTION_NAME);
}

export function DatabasePostgresModel(
    entity: any,
    connectionName?: string
): ParameterDecorator {
    return InjectRepository(entity, connectionName || DATABASE_CONNECTION_NAME);
}

export function DatabasePostgresSchema(
    options?: EntityOptions
): ClassDecorator {
    return Entity(options);
}
