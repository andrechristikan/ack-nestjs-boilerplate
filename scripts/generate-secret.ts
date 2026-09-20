import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';

const EncryptionSecretLengthInBytes = 48;

const Usage = `
Usage: node scripts/generate-secret.ts <all|jwt|encryption> [--direct-insert]

Commands:
  all           Run jwt, then encryption, with the same --direct-insert choice for both.
  jwt           Generate the JWT keys (ES256 for access tokens, ES512 for refresh tokens) and JWKS:
                1. Save the key pairs to ./keys as PEM files (always)
                2. Create separate access/refresh JWKS files in ./keys (always)
                3. Update .env with the keys and KIDs (only with --direct-insert)
                Never touches ./keys/encryption-secret.env or the encryption variables.
  encryption    Generate APP_ENCRYPTION_SECRET_KEY and AUTH_TWO_FACTOR_ENCRYPTION_KEY
                (48 random bytes each, base64url):
                1. Write both to ./keys/encryption-secret.env (always)
                2. Update .env with both secrets (only with --direct-insert)
                Never touches the JWT key files, the JWKS files or the JWT variables.

  Key material and secret values are never printed; only file paths and KIDs are shown.

Options:
  --direct-insert   [OPTIONAL] Upsert the command's variables into .env
                    (created from .env.example when absent).
                    By default, .env is NOT updated.
                    Every run with this flag rotates what the command generates.

Examples:
  pnpm generate:secret
  pnpm generate:secret --direct-insert
  pnpm generate:secret:jwt
  pnpm generate:secret:jwt --direct-insert
  pnpm generate:secret:encryption
  pnpm generate:secret:encryption --direct-insert
  node scripts/generate-secret.ts all --direct-insert
  node scripts/generate-secret.ts jwt --direct-insert
  node scripts/generate-secret.ts encryption --direct-insert
`;

/**
 * Generates the secret targets — the JWT key pairs with their JWKS files, and
 * the two encryption root secrets — one at a time, and optionally upserts only
 * that target's variables into the environment file.
 */
class SecretGenerator {
    private readonly keyDir: string;
    private readonly accessJwksOutputPath: string;
    private readonly refreshJwksOutputPath: string;
    private readonly accessTokenPrivateKeyPath: string;
    private readonly accessTokenPublicKeyPath: string;
    private readonly refreshTokenPrivateKeyPath: string;
    private readonly refreshTokenPublicKeyPath: string;
    private readonly encryptionSecretPath: string;

    constructor(keyDir: string) {
        this.keyDir = keyDir;
        this.accessTokenPrivateKeyPath = path.join(
            this.keyDir,
            'access-token.pem'
        );
        this.accessTokenPublicKeyPath = path.join(
            this.keyDir,
            'access-token.pub'
        );
        this.refreshTokenPrivateKeyPath = path.join(
            this.keyDir,
            'refresh-token.pem'
        );
        this.refreshTokenPublicKeyPath = path.join(
            this.keyDir,
            'refresh-token.pub'
        );
        this.accessJwksOutputPath = path.join(this.keyDir, 'access-jwks.json');
        this.refreshJwksOutputPath = path.join(
            this.keyDir,
            'refresh-jwks.json'
        );
        this.encryptionSecretPath = path.join(
            this.keyDir,
            'encryption-secret.env'
        );
    }

    ensureDir(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Strips PEM armor and whitespace, leaving the raw base64 DER body suitable
     * for environment variables and copy-paste.
     */
    pemToBase64(pem: string): string {
        return pem
            .replace(/-----BEGIN (?:PRIVATE|PUBLIC) KEY-----/g, '')
            .replace(/-----END (?:PRIVATE|PUBLIC) KEY-----/g, '')
            .replace(/\s/g, '');
    }

    /**
     * Generates an EC key pair (PEM/SPKI + PKCS8) for the given curve
     * (`prime256v1` for ES256, `secp521r1` for ES512), writes both files, and
     * locks the private key to owner read/write only.
     */
    generateKeyPair(
        namedCurve: 'prime256v1' | 'secp521r1',
        privateKeyPath: string,
        publicKeyPath: string
    ): { privateKey: string; publicKey: string } {
        const keyPair = crypto.generateKeyPairSync('ec', {
            namedCurve,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        });

        fs.writeFileSync(privateKeyPath, keyPair.privateKey);
        fs.writeFileSync(publicKeyPath, keyPair.publicKey);

        try {
            fs.chmodSync(privateKeyPath, 0o600);
        } catch {
            console.warn(`Could not set permissions for ${privateKeyPath}`);
        }

        return {
            privateKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
        };
    }

    /**
     * Extracts the EC public-point coordinates and curve name from a PEM key.
     */
    extractECParamsFromString(publicKeyString: string): {
        x: string;
        y: string;
        crv: string;
    } {
        try {
            const publicKey = crypto.createPublicKey({
                key: publicKeyString,
                format: 'pem',
            });

            const keyDetails = publicKey.export({ format: 'jwk' });

            return {
                x: keyDetails.x!,
                y: keyDetails.y!,
                crv: keyDetails.crv!,
            };
        } catch (error) {
            console.error(
                `Error extracting EC parameters from public key: ${error instanceof Error ? error.message : String(error)}`
            );
            throw error;
        }
    }

    /**
     * Builds a signature-use JWK from EC parameters.
     */
    createJwk(
        params: {
            x: string;
            y: string;
            crv: string;
        },
        kid: string,
        alg: 'ES256' | 'ES512'
    ): {
        kty: string;
        crv: string;
        x: string;
        y: string;
        use: string;
        alg: string;
        kid: string;
    } {
        return {
            kty: 'EC',
            crv: params.crv,
            x: params.x,
            y: params.y,
            use: 'sig',
            alg: alg,
            kid,
        };
    }

    /**
     * Writes one JWKS file per token type so access and refresh keys stay
     * isolated, returning the random key identifiers assigned to each.
     */
    createSeparateJwksFromStrings(
        accessPublicKey: string,
        refreshPublicKey: string
    ): { accessKid: string; refreshKid: string } {
        const accessParams = this.extractECParamsFromString(accessPublicKey);
        const refreshParams = this.extractECParamsFromString(refreshPublicKey);

        const accessKid = crypto.randomBytes(16).toString('hex');
        const refreshKid = crypto.randomBytes(16).toString('hex');

        const accessJwk = this.createJwk(accessParams, accessKid, 'ES256');
        const refreshJwk = this.createJwk(refreshParams, refreshKid, 'ES512');

        const accessJwks = {
            keys: [accessJwk],
        };

        const refreshJwks = {
            keys: [refreshJwk],
        };

        const outputDir = path.dirname(this.accessJwksOutputPath);
        this.ensureDir(outputDir);

        fs.writeFileSync(
            this.accessJwksOutputPath,
            JSON.stringify(accessJwks, null, 2)
        );
        fs.writeFileSync(
            this.refreshJwksOutputPath,
            JSON.stringify(refreshJwks, null, 2)
        );

        console.log(`✅ Access JWKS created at ${this.accessJwksOutputPath}`);
        console.log(`✅ Refresh JWKS created at ${this.refreshJwksOutputPath}`);

        return { accessKid, refreshKid };
    }

    /**
     * Draws one encryption root secret: 48 random bytes as 64 base64url
     * characters.
     */
    generateEncryptionSecret(): string {
        return crypto
            .randomBytes(EncryptionSecretLengthInBytes)
            .toString('base64url');
    }

    /**
     * Writes both encryption root secrets as `KEY=value` lines into the keys
     * directory and locks the file to owner read/write only. The values are
     * never printed.
     */
    writeEncryptionSecrets(secrets: {
        appEncryptionSecretKey: string;
        twoFactorEncryptionKey: string;
    }): void {
        fs.writeFileSync(
            this.encryptionSecretPath,
            [
                `APP_ENCRYPTION_SECRET_KEY=${secrets.appEncryptionSecretKey}`,
                `AUTH_TWO_FACTOR_ENCRYPTION_KEY=${secrets.twoFactorEncryptionKey}`,
                '',
            ].join('\n'),
            { mode: 0o600 }
        );

        try {
            fs.chmodSync(this.encryptionSecretPath, 0o600);
        } catch {
            console.warn(
                `Could not set permissions for ${this.encryptionSecretPath}`
            );
        }
    }

    /**
     * Generates both JWT key pairs and their JWKS files, prints the output
     * paths, and when `updateEnv` is true upserts only the JWT keys and KIDs
     * into `.env` (`--direct-insert`).
     */
    generateJwtKeys(updateEnv: boolean): void {
        try {
            this.ensureDir(this.keyDir);

            console.log('Generating Access Token ES256 keys...');
            const accessKeys = this.generateKeyPair(
                'prime256v1',
                this.accessTokenPrivateKeyPath,
                this.accessTokenPublicKeyPath
            );

            console.log('Generating Refresh Token ES512 keys...');
            const refreshKeys = this.generateKeyPair(
                'secp521r1',
                this.refreshTokenPrivateKeyPath,
                this.refreshTokenPublicKeyPath
            );

            console.log('Generating separate JWKS files...');
            const { accessKid, refreshKid } =
                this.createSeparateJwksFromStrings(
                    accessKeys.publicKey,
                    refreshKeys.publicKey
                );

            if (updateEnv) {
                this.upsertEnv([
                    { key: 'AUTH_JWT_ACCESS_TOKEN_KID', value: accessKid },
                    { key: 'AUTH_JWT_REFRESH_TOKEN_KID', value: refreshKid },
                    {
                        key: 'AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY',
                        value: this.pemToBase64(accessKeys.privateKey),
                    },
                    {
                        key: 'AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY',
                        value: this.pemToBase64(accessKeys.publicKey),
                    },
                    {
                        key: 'AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY',
                        value: this.pemToBase64(refreshKeys.privateKey),
                    },
                    {
                        key: 'AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY',
                        value: this.pemToBase64(refreshKeys.publicKey),
                    },
                ]);
            }

            console.log('✅ JWT keys and JWKS generated successfully!');
            console.log('🔑 Algorithm Configuration:');
            console.log('   • Access Token:  ES256 (ECDSA with P-256 curve)');
            console.log('   • Refresh Token: ES512 (ECDSA with P-521 curve)');
            console.log('');
            console.log(
                '📁 Files written (open these — key material is NOT printed, for security):'
            );
            console.log(
                `   • Access private:  ${this.accessTokenPrivateKeyPath}`
            );
            console.log(
                `   • Access public:   ${this.accessTokenPublicKeyPath}`
            );
            console.log(
                `   • Refresh private: ${this.refreshTokenPrivateKeyPath}`
            );
            console.log(
                `   • Refresh public:  ${this.refreshTokenPublicKeyPath}`
            );
            console.log(
                `   • Access JWKS:     ${this.accessJwksOutputPath} (kid: ${accessKid})`
            );
            console.log(
                `   • Refresh JWKS:    ${this.refreshJwksOutputPath} (kid: ${refreshKid})`
            );
            console.log('');
            if (updateEnv) {
                console.log(
                    '✅ .env updated with JWT keys and KIDs (--direct-insert). Ready for application use.'
                );
                console.warn(
                    '⚠️  --direct-insert rotated the JWT keys: issued tokens stop verifying.'
                );
            } else {
                console.log(
                    '⏭️  .env not updated (default). Run with --direct-insert to write the JWT keys and KIDs into .env automatically.'
                );
            }
        } catch (err) {
            console.error(
                `Failed to generate JWT keys: ${err instanceof Error ? err.message : String(err)}`
            );
            process.exit(1);
        }
    }

    /**
     * Generates both encryption root secrets into the secrets file, prints its
     * path, and when `updateEnv` is true upserts only those two variables into
     * `.env` (`--direct-insert`).
     */
    generateEncryptionSecrets(updateEnv: boolean): void {
        try {
            this.ensureDir(this.keyDir);

            console.log('Generating encryption secrets...');
            const secrets = {
                appEncryptionSecretKey: this.generateEncryptionSecret(),
                twoFactorEncryptionKey: this.generateEncryptionSecret(),
            };
            this.writeEncryptionSecrets(secrets);

            if (updateEnv) {
                this.upsertEnv([
                    {
                        key: 'APP_ENCRYPTION_SECRET_KEY',
                        value: secrets.appEncryptionSecretKey,
                    },
                    {
                        key: 'AUTH_TWO_FACTOR_ENCRYPTION_KEY',
                        value: secrets.twoFactorEncryptionKey,
                    },
                ]);
            }

            console.log('✅ Encryption secrets generated successfully!');
            console.log('');
            console.log(
                '📁 File written (open it — secret values are NOT printed, for security):'
            );
            console.log(
                `   • Encryption secrets: ${this.encryptionSecretPath} (APP_ENCRYPTION_SECRET_KEY, AUTH_TWO_FACTOR_ENCRYPTION_KEY)`
            );
            console.log('');
            if (updateEnv) {
                console.log(
                    '✅ .env updated with both encryption secrets (--direct-insert). Ready for application use.'
                );
                console.warn(
                    '⚠️  --direct-insert rotated both encryption secrets: existing ciphertext can no longer be decrypted.'
                );
            } else {
                console.log(
                    `⏭️  .env not updated (default). Copy the two lines from ${this.encryptionSecretPath} into .env, or run with --direct-insert to write them into .env automatically.`
                );
            }
        } catch (err) {
            console.error(
                `Failed to generate encryption secrets: ${err instanceof Error ? err.message : String(err)}`
            );
            process.exit(1);
        }
    }

    /**
     * Upserts the given variables into `.env`, creating it from `.env.example`
     * when absent, and locks the file to owner read/write only. Variables not
     * named are left as they are.
     */
    upsertEnv(updates: { key: string; value: string }[]): void {
        const envPath = path.join(process.cwd(), '.env');
        const envExamplePath = path.join(process.cwd(), '.env.example');

        if (!fs.existsSync(envPath)) {
            if (fs.existsSync(envExamplePath)) {
                fs.copyFileSync(envExamplePath, envPath);
                console.log('📄 .env file created from .env.example');
            } else {
                console.error('.env.example not found. Cannot create .env');
                process.exit(1);
            }
        }

        const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
        for (const { key, value } of updates) {
            const line = `${key}=${value}`;
            const index = envLines.findIndex(existing =>
                existing.startsWith(`${key}=`)
            );
            if (index === -1) {
                envLines.push(line);
            } else {
                envLines[index] = line;
            }
        }

        fs.writeFileSync(envPath, envLines.join('\n'));

        try {
            fs.chmodSync(envPath, 0o600);
        } catch {
            console.warn(`Could not set permissions for ${envPath}`);
        }

        console.log(
            `📝 .env file updated: ${updates.map(({ key }) => key).join(', ')}`
        );
    }
}

function main(): void {
    const argv = process.argv.slice(2);

    const useDirectInsert = argv.includes('--direct-insert');
    const command = argv.find(arg => !arg.startsWith('--'));

    const generator = new SecretGenerator(path.join(process.cwd(), 'keys'));

    if (command === 'all') {
        generator.generateJwtKeys(useDirectInsert);
        generator.generateEncryptionSecrets(useDirectInsert);
    } else if (command === 'jwt') {
        generator.generateJwtKeys(useDirectInsert);
    } else if (command === 'encryption') {
        generator.generateEncryptionSecrets(useDirectInsert);
    } else {
        console.error(Usage);
        process.exit(1);
    }
}

/**
 * CLI entry point.
 */
main();
