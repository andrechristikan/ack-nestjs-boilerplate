import { ObjectType } from '@nestjs/graphql';

export function GraphqlSchema(name?: string): ClassDecorator {
    return function (target: Function) {
        // Apply the graphql object type decorator
        ObjectType(name)(target);
    };
}