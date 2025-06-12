export interface SettingJson {
    enabled: boolean;
    properties: SettingValue;
}

export type SettingValue =
    | boolean
    | string
    | number
    | SettingValue[]
    | SettingJson
    | { [key: string]: SettingValue };
