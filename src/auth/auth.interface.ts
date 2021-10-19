import { UserLoginTransformer } from 'src/user/transformer/user.login.transformer';

export type IAuthApplyDecorator = <TFunction extends Function, Y>(
    target: Record<string, any> | TFunction,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<Y>
) => void;

export interface IPayload extends UserLoginTransformer {
    exp: number;
    nbf: number;
    iat: number;
    rememberMe: boolean;
}
