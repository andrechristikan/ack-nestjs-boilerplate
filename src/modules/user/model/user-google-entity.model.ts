import {GraphqlSchema} from "../../../common/graphql/decorators/graphql.decorator";
import {Field} from "@nestjs/graphql";

@GraphqlSchema('UserGoogleEntity')
export class UserGoogleEntity {
    @Field()
    accessToken: string;

    @Field()
    refreshToken: string;
}