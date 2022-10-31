export function ApiKeyBeforeSaveHook() {
    this.name = this.name.toLowerCase().trim();
    this.key = this.key.trim();
    this.hash = this.hash.trim();
    this.encryptionKey = this.encryptionKey.trim();
    this.passphrase = this.passphrase.trim();
}
