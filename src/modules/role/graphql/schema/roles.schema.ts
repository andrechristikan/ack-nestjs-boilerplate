import { ENUM_ROLE_TYPE } from 'src/modules/role/constants/role.enum.constant';
import {GraphqlSchema} from "../../../../common/graphql/decorators/graphql.decorator";
import {Field} from "@nestjs/graphql";
import {PolicyRule} from "../../../../common/policy/models/ploicy-rule.model";


@GraphqlSchema('roles')
export class RoleSchema  {
    @Field(() => String)
    name: string;

    @Field(() => String,{ nullable: true })
    description?: string;

    @Field(()=>Boolean)
    isActive: boolean;

    @Field(() => ENUM_ROLE_TYPE)
    type: ENUM_ROLE_TYPE;

    @Field(() => [PolicyRule])
    permissions: PolicyRule[];
}

