import { Type } from '@nestjs/common';
import {
    InjectConnection,
    InjectModel,
    Prop,
    PropOptions,
    Schema,
    SchemaFactory,
    SchemaOptions,
} from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import {
    DATABASE_CONNECTION_NAME,
    DATABASE_CREATED_AT_FIELD_NAME,
    DATABASE_UPDATED_AT_FIELD_NAME,
} from 'src/common/database/constants/database.constant';

export function DatabaseConnection(
    connectionName?: string
): ParameterDecorator {
    return InjectConnection(connectionName ?? DATABASE_CONNECTION_NAME);
}

export function DatabaseModel(
    entity: any,
    connectionName?: string
): ParameterDecorator {
    return InjectModel(entity, connectionName ?? DATABASE_CONNECTION_NAME);
}

export function DatabaseEntity(options?: SchemaOptions): ClassDecorator {
    return Schema({
        ...options,
        versionKey: false,
        timestamps: options?.timestamps ?? {
            createdAt: DATABASE_CREATED_AT_FIELD_NAME,
            updatedAt: DATABASE_UPDATED_AT_FIELD_NAME,
        },
    });
}

export function DatabaseProp(options?: PropOptions<any>): PropertyDecorator {
    return Prop(options);
}

export function DatabaseSchema<T = any, N = MongooseSchema<T>>(
    entity: Type<T>
): N {
    return SchemaFactory.createForClass<T>(entity) as N;
}
