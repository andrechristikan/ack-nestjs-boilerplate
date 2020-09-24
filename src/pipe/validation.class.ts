import * as jf from '@hapi/joi';

export class Validation {
    private rules: Record<string, any>;
    private schema: jf.ObjectSchema;

    setRules(): void {
        return;
    }

    buildSchema(): void {
        const schema = {};
        for (const property in this.rules) {
            if (
                this.rules[property].type === 'string' ||
                this.rules[property].type === 'base64' ||
                this.rules[property].type === 'email' ||
                this.rules[property].type === 'domain' ||
                this.rules[property].type === 'uuid' ||
                this.rules[property].type === 'hex' ||
                this.rules[property].type === 'ip' ||
                this.rules[property].type === 'time' ||
                this.rules[property].type === 'token'
            ) {
                schema[property] = jf.string();

                if (this.rules[property].type === 'base64') {
                    schema[property] = schema[property].base64(true);
                } else if (this.rules[property].type === 'domain') {
                    schema[property] = schema[property].domain({ allow: true });
                } else if (this.rules[property].type === 'email') {
                    schema[property] = schema[property].email({
                        allowUnicode: false,
                        ignoreLength: false,
                        multiple: true,
                        separator: ';',
                        tlds: { allow: true },
                    });
                } else if (this.rules[property].type === 'uuid') {
                    schema[property] = schema[property].uuid('uuidv5');
                } else if (this.rules[property].type === 'hex') {
                    schema[property] = schema[property].hex(false);
                } else if (this.rules[property].type === 'ip') {
                    schema[property] = schema[property].ip({ version: 'ipv4' });
                } else if (this.rules[property].type === 'time') {
                    schema[property] = schema[property].isoDuration();
                } else if (this.rules[property].type === 'token') {
                    schema[property] = schema[property].token();
                } else {
                    if (this.rules[property].lowercase) {
                        schema[property] = schema[property].case('lower');
                    }

                    if (this.rules[property].uppercase) {
                        schema[property] = schema[property].case('upper');
                    }

                    if (this.rules[property].alphanumeric) {
                        schema[property] = schema[property].alphanum();
                    }

                    if (this.rules[property].insensitive) {
                        schema[property] = schema[property].insensitive();
                    }

                    if (this.rules[property].max > 0) {
                        schema[property] = schema[property].max(
                            this.rules[property].max,
                        );
                    }

                    if (this.rules[property].min > 0) {
                        schema[property] = schema[property].min(
                            this.rules[property].min,
                        );
                    }
                }
            }
        }

        this.schema = jf.object(schema);
    }
}
