import { IUserSafe } from 'user/user.interface';

export interface ILogin {
    email: string;
    password: string;
}
export type IPayload = Omit<IUserSafe, 'mobileNumber'>;
export interface IPayloadBasicToken {
    clientBasicToken: string;
}

export type IApplyDecorator = <TFunction extends Function, Y>(
    target: Record<string, any> | TFunction,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<Y>
) => void;
