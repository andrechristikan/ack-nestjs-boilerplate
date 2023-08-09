
import {Field, ObjectType} from "@nestjs/graphql";
import { GraphQLJWT } from 'graphql-scalars';
import {IResponseGqlMetadata} from "../../../common/response/interfaces/response.gql.interface";

@ObjectType()
export class UserLoginSerialization {

    @Field({nullable:true})
    readonly tokenType: string;

    @Field()

    readonly expiresIn: string;

    @Field(() => GraphQLJWT, { description: 'JWT access token' })

    readonly accessToken: string;
    @Field(() => GraphQLJWT, { description: 'JWT access token' })

    readonly refreshToken: string;
}

@ObjectType()
export class UserLoginSerializationGql {
    @Field(() => UserLoginSerialization)
    readonly data: UserLoginSerialization;

    _metadata?: IResponseGqlMetadata;


}