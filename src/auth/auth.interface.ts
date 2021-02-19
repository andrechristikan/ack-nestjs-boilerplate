import { IUserSafe } from 'src/user/user.interface';

export interface ILogin {
    readonly email: string;
    readonly password: string;
}
export type IPayload = Pick<
    IUserSafe,
    'id' | 'email' | 'firstName' | 'lastName'
>;
export interface IPayloadBasicToken {
    readonly clientBasicToken: string;
}

export type IApplyDecorator = <TFunction extends Function, Y>(
    target: Record<string, any> | TFunction,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<Y>
) => void;
