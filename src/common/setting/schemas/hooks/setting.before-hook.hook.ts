export function SettingBeforeSaveHook() {
    this.name = this.name.trim();
    this.value = this.value.trim();
}
