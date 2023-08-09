import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';

import { ENUM_USER_SIGN_UP_FROM } from 'src/modules/user/constants/user.enum.constant';
import {Field} from "@nestjs/graphql";
import {GraphqlSchema} from "../../../../common/graphql/decorators/graphql.decorator";
import {UserGoogleEntity} from "../../model/user-google-entity.model";
import {RoleSchema} from "../../../role/graphql/schema/roles.schema";

@GraphqlSchema('users')
export class UserSchema  {
    @Field(() => String, { nullable: true })

    username?: string;

    @Field()

    firstName: string;

    @Field()

    lastName: string;

    @Field(() => String, { nullable: true })

    mobileNumber?: string;

    @Field()

    email: string;

    @Field(() => RoleSchema)

    role: string;


    @Field(() => Date, { nullable: true })
    passwordExpired: Date;


    @Field(() => Date, { nullable: true })
    passwordCreated: Date;


    passwordAttempt: number;

    @Field()

    signUpDate: Date;

    @Field(() => ENUM_USER_SIGN_UP_FROM)

    signUpFrom: ENUM_USER_SIGN_UP_FROM;


    salt: string;

    @Field(()=>Boolean)

    isActive: boolean;

    @Field(()=>Boolean)

    inactivePermanent: boolean;

    @Field(() => Date, { nullable: true })

    inactiveDate?: Date;

    @Field(()=>Boolean)

    blocked: boolean;

    @Field(() => Date, { nullable: true })

    blockedDate?: Date;

    @Field(() => AwsS3Serialization, { nullable: true })

    photo?: AwsS3Serialization;

    @Field(() => UserGoogleEntity, { nullable: true })

    google?: UserGoogleEntity;
}




