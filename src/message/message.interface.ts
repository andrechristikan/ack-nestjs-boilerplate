export type IMessage = Record<string, string>;

export interface IMessageOptionsProperties {
    readonly property: string;
    readonly value: any;
}
export interface IMessageOptions {
    readonly appLanguages?: string[];
    readonly properties?: IMessageOptionsProperties;
}

export interface IMessageProperties {
    readonly path: string;
    readonly properties?: IMessageOptionsProperties;
}

export type IMessageSetOptions = Omit<IMessageOptions, 'appLanguages'>;
