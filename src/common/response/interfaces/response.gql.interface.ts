import { HttpStatus } from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';
import { ENUM_HELPER_FILE_TYPE } from 'src/common/helper/constants/helper.enum.constant';
import { IHelperFileRows } from 'src/common/helper/interfaces/helper.interface';
import { IMessageOptionsProperties } from 'src/common/message/interfaces/message.interface';
import {Field, Int, ObjectType} from "@nestjs/graphql";
import {GraphQLJSON} from "graphql-scalars";





@ObjectType()
export class IResponseGqlCustomPropertyMetadata {
    @Field(()=>Int,{ nullable: true })
    statusCode?: number;

    @Field({ nullable: true })
    message?: string;

    httpStatus?: HttpStatus;

    messageProperties?: IMessageOptionsProperties;
}



@ObjectType()
export class IResponseGqlMetadata {
    @Field(() => IResponseGqlCustomPropertyMetadata)
    customProperty: IResponseGqlCustomPropertyMetadata;

    @Field(() => GraphQLJSON,{nullable:true})
    value?: any;
}


export interface IResponseGqlOptions<T> {
    serialization?: ClassConstructor<T>;
    messageProperties?: IMessageOptionsProperties;
}

export interface IResponseGqlPagingOptions<T>
    extends Omit<IResponseGqlOptions<T>, 'serialization'> {
    serialization: ClassConstructor<T>;
}

export interface IResponseGqlFileOptions<T> extends IResponseGqlOptions<T> {
    fileType?: ENUM_HELPER_FILE_TYPE;
}

// type
export interface IResponseGql {
    _metadata?: IResponseGqlMetadata;
    data?: Record<string, any>;
}

export interface IResponseGqlPagingPagination {
    totalPage: number;
    total: number;
}

export interface IResponseGqlPaging {
    _metadata?: IResponseGqlMetadata;
    _pagination: IResponseGqlPagingPagination;
    data: Record<string, any>[];
}

export interface IResponseGqlFile {
    data: IHelperFileRows[];
}