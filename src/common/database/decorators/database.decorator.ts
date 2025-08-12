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
 * Decorator to inject a MongoDB database connection into a class constructor parameter.
 * Uses the default database connection name if none is specified.
 *
 * @param connectionName - Optional name of the database connection to inject.
 *                        If not provided, uses the default DATABASE_CONNECTION_NAME.
 * @returns A parameter decorator that injects the database connection.
 */
export function InjectDatabaseConnection(
    connectionName?: string
): ParameterDecorator {
    return InjectConnection(connectionName ?? DATABASE_CONNECTION_NAME);
}

/**
 * Decorator to inject a Mongoose model into a class constructor parameter.
 * Uses the default database connection name if none is specified.
 *
 * @param entity - The name of the entity/model to inject.
 * @param connectionName - Optional name of the database connection.
 *                        If not provided, uses the default DATABASE_CONNECTION_NAME.
 * @returns A parameter decorator that injects the Mongoose model.
 */
export function InjectDatabaseModel(
    entity: string,
    connectionName?: string
): ParameterDecorator {
    return InjectModel(entity, connectionName ?? DATABASE_CONNECTION_NAME);
}

/**
 * Class decorator that defines a Mongoose schema with automatic timestamp fields.
 * Automatically adds `createdAt` and `updatedAt` timestamp fields to the schema.
 *
 * @param options - Optional schema configuration options that will be merged
 *                 with the default timestamp configuration.
 * @returns A class decorator that applies the schema definition.
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
 * This is a wrapper around the standard Mongoose @Prop decorator.
 *
 * @param options - Optional property configuration options such as type,
 *                 required, default, index, etc.
 * @returns A property decorator that defines the schema property.
 */
export function DatabaseProp(options?: PropOptions): PropertyDecorator {
    return Prop(options);
}

/**
 * Property decorator that defines a Mongoose schema property for joining/referencing another entity.
 * Creates a reference field that can be populated with related document data using explicit foreign key mapping.
 *
 * This decorator is designed for populate/virtual fields that reference other entities.
 * The actual foreign key value should be stored in a separate field using @DatabaseProp.
 *
 * @param joinProps - Configuration object defining the join relationship
 * @param joinProps.fromEntity - The name of the entity/model to reference (should be Entity.name)
 * @param joinProps.localField - The field name in the current entity that stores the foreign key value
 * @param joinProps.fromField - The field name in the referenced entity to join on (defaults to '_id')
 * @returns A property decorator that defines the schema reference property for population.
 */
export function DatabasePropJoin(
    joinProps: IDatabaseJoinProps
): PropertyDecorator {
    const foreignField = joinProps?.fromField || '_id';

    return Prop({
        required: false,
        ref: joinProps.fromEntity,
        localField: joinProps.localField,
        foreignField,
        isJoin: true,
    });
}

/**
 * Creates a Mongoose schema from a class definition.
 * This function takes an entity class and generates the corresponding Mongoose schema.
 *
 * @template T - The type of the entity class.
 * @template N - The type of the resulting schema (defaults to MongooseSchema<T>).
 * @param entity - The entity class to create a schema from.
 * @returns The generated Mongoose schema.
 */
export function DatabaseSchema<T, N = MongooseSchema<T>>(entity: Type<T>): N {
    return SchemaFactory.createForClass<T>(entity) as N;
}
