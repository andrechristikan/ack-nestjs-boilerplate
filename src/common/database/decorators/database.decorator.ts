import { applyDecorators } from '@nestjs/common';
import {
    InjectConnection,
    InjectModel,
    Prop,
    PropOptions,
    Schema,
    SchemaFactory,
    SchemaOptions,
} from '@nestjs/mongoose';
import { CallbackWithoutResultAndOptionalError } from 'mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum.constant';
import { Skip } from 'src/common/request/validations/request.skip.validation';
import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    Entity,
    EntityOptions,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';

// for load env
import { config } from 'dotenv';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';
config();

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

export function DatabaseEntity(
    options?: SchemaOptions | EntityOptions
): ClassDecorator {
    return process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
        ? Schema(options as SchemaOptions)
        : Entity(options as EntityOptions);
}

export function DatabaseProp(options?: PropOptions<any>): PropertyDecorator {
    return process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
        ? Prop(options)
        : Column();
}

export function DatabasePropForeign(
    options?: PropOptions<any>
): PropertyDecorator {
    return process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
        ? Prop(options)
        : Column();
}

export function DatabasePropPrimary(): PropertyDecorator {
    return process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
        ? Prop({
              type: String,
              default: DatabaseDefaultUUID,
          })
        : PrimaryGeneratedColumn;
}

export function DatabaseHookBefore(): PropertyDecorator {
    if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
        return Skip();
    }

    return applyDecorators(BeforeInsert, BeforeUpdate);
}

export function DatabaseSchema<T>(entity: T): any {
    if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
        const schema = SchemaFactory.createForClass<T>(entity as any);
        schema.pre(
            'save',
            function (next: CallbackWithoutResultAndOptionalError) {
                const cls = new (entity as any)();
                if (cls.hookBefore && typeof cls.hookBefore === 'function') {
                    const bHook = cls.hookBefore.bind(this);
                    bHook();
                }

                next();
            }
        );

        return schema;
    }

    return entity;
}
