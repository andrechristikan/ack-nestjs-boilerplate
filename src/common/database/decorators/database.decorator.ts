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
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { IDatabaseQueryContainOptions } from 'src/common/database/interfaces/database.interface';

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
        timestamps: options?.timestamps ?? {
            createdAt: true,
            updatedAt: true,
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

export function DatabaseQueryIn<T = string>(
    field: string,
    values: T[]
): Record<string, any> {
    return {
        [field]: {
            $in: values,
        },
    };
}
export function DatabaseQueryNin<T = string>(
    field: string,
    values: T[]
): Record<string, any> {
    return {
        [field]: {
            $nin: values,
        },
    };
}

export function DatabaseQueryEqual<T = string>(
    field: string,
    value: T
): Record<string, any> {
    return {
        [field]: value,
    };
}

export function DatabaseQueryNotEqual<T = string>(
    field: string,
    value: T
): Record<string, any> {
    return {
        [field]: {
            $ne: value,
        },
    };
}

export function DatabaseQueryContain(
    field: string,
    value: string,
    options?: IDatabaseQueryContainOptions
) {
    if (options?.fullWord) {
        return {
            [field]: {
                $regex: new RegExp(`\\b${value}\\b`),
                $options: 'i',
            },
        };
    }

    return {
        [field]: {
            $regex: new RegExp(value),
            $options: 'i',
        },
    };
}

export function DatabaseQueryOr(queries: Record<string, any>[]) {
    return {
        $or: queries,
    };
}

export function DatabaseQueryAnd(queries: Record<string, any>[]) {
    return {
        $and: queries,
    };
}
