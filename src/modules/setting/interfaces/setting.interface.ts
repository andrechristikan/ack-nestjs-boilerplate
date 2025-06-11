export interface SettingJson {
    enabled: boolean;
    [key: string]: SettingValue;
}

export type SettingValue =
    | boolean
    | string
    | number
    | SettingValue[]
    | SettingJson;
