export interface IMessage {
    readonly language: string;
    readonly message: string;
}

export interface IMessageOptions {
    readonly appLanguages?: string[];
    readonly property?: string;
    readonly propertyValue?: string;
}

export type IMessageSetOptions = Omit<IMessageOptions, 'appLanguages'>;
