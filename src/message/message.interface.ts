export type IMessage = Record<string, string>;

export interface IMessageOptions {
    readonly appLanguages?: string[];
    readonly properties?: Record<string, any>;
}

export type IMessageSetOptions = Omit<IMessageOptions, 'appLanguages'>;
