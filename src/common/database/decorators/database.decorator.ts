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
import { SchemaType as MongooseSchema } from 'mongoose';
import { DATABASE_CONNECTION_NAME } from '@common/database/constants/database.constant';
import { IDatabaseJoinProps } from '@common/database/interfaces/database.interface';

/**
 * Parameter decorator that injects a MongoDB database connection into a class constructor parameter.
 *
 * Uses the default database connection name if none is specified. This decorator is typically
 * used in service constructors to inject the MongoDB connection for direct database operations.
 *
 * @param connectionName Optional name of the database connection to inject.
 *                       If not provided, uses the default DATABASE_CONNECTION_NAME.
 * @returns A parameter decorator that injects the specified database connection.
 */
export function InjectDatabaseConnection(
    connectionName?: string
): ParameterDecorator {
    return InjectConnection(connectionName ?? DATABASE_CONNECTION_NAME);
}

/**
 * Parameter decorator that injects a Mongoose model into a class constructor parameter.
 *
 * Uses the default database connection name if none is specified. This decorator is commonly
 * used in repository or service classes to inject specific Mongoose models for data operations.
 *
 * @param entity The name of the entity/model to inject.
 * @param connectionName Optional name of the database connection.
 *                       If not provided, uses the default DATABASE_CONNECTION_NAME.
 * @returns A parameter decorator that injects the specified Mongoose model.
 */
export function InjectDatabaseModel(
    entity: string,
    connectionName?: string
): ParameterDecorator {
    return InjectModel(entity, connectionName ?? DATABASE_CONNECTION_NAME);
}

/**
 * Class decorator that defines a Mongoose schema with automatic timestamp fields.
 *
 * Automatically adds `createdAt` and `updatedAt` timestamp fields to the schema and
 * disables the version key (`__v`) field. This decorator should be applied to entity
 * classes that represent MongoDB documents.
 *
 * @param options Optional schema configuration options that will be merged
 *                with the default timestamp and version key configuration.
 * @returns A class decorator that applies the schema definition with timestamps.
 */
export function DatabaseEntity(options?: SchemaOptions): ClassDecorator {
    return Schema({
        ...options,
        versionKey: false,
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt',
        },
    });
}

/**
 * Property decorator that defines a Mongoose schema property.
 *
 * This is a wrapper around the standard Mongoose @Prop decorator, providing
 * a consistent interface for defining database schema properties. Use this
 * decorator on entity class properties to define their database schema behavior.
 *
 * @param options Optional property configuration options such as type,
 *                required, default, index, unique, etc.
 * @returns A property decorator that defines the schema property configuration.
 */
export function DatabaseProp(options?: PropOptions): PropertyDecorator {
    return Prop(options);
}

export function DatabasePropJoin(
    joinProps: IDatabaseJoinProps
): PropertyDecorator {
    const foreignField = joinProps?.fromField || '_id';

    return Prop({
        required: false,
        ref: joinProps.fromEntity,
        localField: joinProps.localField,
        foreignField,
        type: Object,
    });
}

export function DatabasePropJoinMultiple(
    joinProps: IDatabaseJoinProps
): PropertyDecorator {
    const foreignField = joinProps?.fromField || '_id';

    return Prop({
        required: false,
        ref: joinProps.fromEntity,
        localField: joinProps.localField,
        foreignField,
        type: [Object],
    });
}

/**
 * Creates a Mongoose schema from a class definition.
 *
 * This function takes an entity class and generates the corresponding Mongoose schema
 * using the SchemaFactory. The generated schema includes all properties decorated
 * with @DatabaseProp and other database decorators.
 *
 * @template T The type of the entity class.
 * @template N The type of the resulting schema (defaults to MongooseSchema<T>).
 * @param entity The entity class to create a schema from.
 * @returns The generated Mongoose schema instance.
 */
export function DatabaseSchema<T, N = MongooseSchema<T>>(entity: Type<T>): N {
    return SchemaFactory.createForClass<T>(entity) as N;
}
