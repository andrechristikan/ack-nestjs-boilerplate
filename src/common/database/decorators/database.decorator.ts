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
import { CallbackWithoutResultAndOptionalError, Types } from 'mongoose';
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
import { v4 as uuidV4 } from 'uuid';

// for load env
import { config } from 'dotenv';
import { DatabasePrimaryKeyType } from 'src/common/database/interfaces/database.interface';
config();

export function DatabaseConnection(
    connectionName?: string
): ParameterDecorator {
    return InjectConnection(connectionName || DATABASE_CONNECTION_NAME);
}

export function DatabaseModel(
    entity: string,
    connectionName?: string
): ParameterDecorator {
    return InjectModel(entity, connectionName || DATABASE_CONNECTION_NAME);
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
    options?: PropOptions<any>,
    multiple?: boolean
): PropertyDecorator {
    return process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
        ? Prop({
              ...(options as object),
              type: multiple ? Array<Types.ObjectId> : Types.ObjectId,
          })
        : Column();
}

export function DatabasePropPrimary(): PropertyDecorator {
    return process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
        ? Prop({ type: Types.ObjectId })
        : PrimaryGeneratedColumn;
}

export function DatabaseHookBefore(): PropertyDecorator {
    if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
        return applyDecorators(Skip());
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
                if (cls.beforeHook && typeof cls.beforeHook === 'function') {
                    const bHook = cls.beforeHook.bind(this);
                    bHook();
                }

                this._id = DatabasePrimaryKey();
                next();
            }
        );

        return schema;
    }

    return entity;
}

export function DatabasePrimaryKey(_id?: string): DatabasePrimaryKeyType {
    if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
        return new Types.ObjectId(_id);
    }

    return _id ? _id : uuidV4();
}
