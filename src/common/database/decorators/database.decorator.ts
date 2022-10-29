import { applyDecorators } from '@nestjs/common';
import {
    InjectConnection,
    InjectModel,
    Prop,
    PropOptions,
    Schema,
    SchemaFactory,
} from '@nestjs/mongoose';
import {
    CallbackWithoutResultAndOptionalError,
    SchemaTypeOptions,
} from 'mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum.constant';
import { Skip } from 'src/common/request/validations/request.skip.validation';
import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    ColumnOptions,
    ColumnType,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';
import {
    IDatabasePropOptions,
    IDatabaseSchemeOptions,
} from 'src/common/database/interfaces/database.interface';

// for load env
import { config } from 'dotenv';
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

export function DatabaseEntity(): ClassDecorator {
    if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
        return Schema();
    }

    return Entity();
}

export function DatabaseProp(options: IDatabasePropOptions): PropertyDecorator {
    if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
        const ops: PropOptions = {
            required: options.required ?? false,
            index: options.index ?? false,
            unique: options.unique ?? false,
            minLength: options.minLength ?? undefined,
            maxLength: options.maxLength ?? undefined,
            enum: options.enum ?? undefined,
            type: options.type as SchemaTypeOptions<any>,
        };

        if (ops.type === 'object' && !('_id' in ops.type)) {
            ops._id = false;
        } else if (Array.isArray(ops.type) && !('_id' in ops.type[0])) {
            ops._id = false;
        }

        return Prop(ops);
    }

    const ops: ColumnOptions = {
        nullable: options.required ? false : true,
        unique: options.unique ?? false,
        length: options.maxLength ?? undefined,
        enum: options.enum ?? undefined,
        type: options.type as ColumnType,
    };

    return Column(ops);
}

export function DatabasePropPrimary(): PropertyDecorator {
    return process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
        ? Prop({
              type: String,
              default: DatabaseDefaultUUID,
          })
        : PrimaryGeneratedColumn('uuid', {
              name: '_id',
          });
}

export function DatabasePropForeign(
    options?: PropOptions<any>
): PropertyDecorator {
    return process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
        ? Prop(options)
        : Column();
}

export function DatabaseHookBeforeSave(): PropertyDecorator {
    if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
        return Skip();
    }

    return applyDecorators(BeforeInsert, BeforeUpdate);
}

export function DatabaseSchema<T>(
    entity: T,
    options?: IDatabaseSchemeOptions
): any {
    // todo
    console.log('aaa');
    console.log('options', options);
    console.log('ccc');

    if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
        const schema = SchemaFactory.createForClass<T>(entity as any);
        schema.pre(
            'save',
            function (next: CallbackWithoutResultAndOptionalError) {
                const cls = new (entity as any)();
                if (
                    cls.hookBeforeSave &&
                    typeof cls.hookBeforeSave === 'function'
                ) {
                    const bHook = cls.hookBeforeSave.bind(this);
                    bHook();
                }

                next();
            }
        );

        return schema;
    }

    return entity;
}
