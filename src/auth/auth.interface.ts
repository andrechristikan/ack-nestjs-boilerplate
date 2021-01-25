export interface ILogin {
    email: string;
    password: string;
}
export interface IPayload {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export type IApplyDecorator = <TFunction extends Function, Y>(
    target: Record<string, any> | TFunction,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<Y>
) => void;
