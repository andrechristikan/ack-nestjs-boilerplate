import {Field} from "@nestjs/graphql";
import {ENUM_POLICY_ACTION, ENUM_POLICY_SUBJECT} from "../constants/policy.enum.constant";
import {GraphqlSchema} from "../../graphql/decorators/graphql.decorator";

@GraphqlSchema()
export class PolicyRule {
    @Field(() => ENUM_POLICY_SUBJECT)
    subject: ENUM_POLICY_SUBJECT;

    @Field(() => [ENUM_POLICY_ACTION])
    action: ENUM_POLICY_ACTION[];
}