import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Generates JWT key pairs (ES256 access, ES512 refresh) plus separate
 * per-token JWKS files for security isolation, and optionally writes them
 * into the environment file.
 */
class JwtKeysGenerator {
    private readonly keyDir: string;
    private readonly accessJwksOutputPath: string;
    private readonly refreshJwksOutputPath: string;
    private readonly accessTokenPrivateKeyPath: string;
    private readonly accessTokenPublicKeyPath: string;
    private readonly refreshTokenPrivateKeyPath: string;
    private readonly refreshTokenPublicKeyPath: string;

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
     * Generates both key pairs and the JWKS files, prints the output paths, and
     * when `updateEnv` is true injects the keys/KIDs into `.env`
     * (`--direct-insert`).
     */
    generateKeys(updateEnv: boolean = false): void {
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
                this.updateEnvWithKeys(
                    accessKid,
                    refreshKid,
                    accessKeys,
                    refreshKeys
                );
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
                    '✅ .env updated with keys and KIDs (--direct-insert). Ready for application use.'
                );
            } else {
                console.log(
                    '⏭️  .env not updated (default). Run with --direct-insert to write keys into .env automatically.'
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
     * Upserts the key/KID environment variables into `.env`, creating it from
     * `.env.example` when absent, and locks the file to owner read/write only.
     */
    updateEnvWithKeys(
        accessKid: string,
        refreshKid: string,
        accessKeys: { privateKey: string; publicKey: string },
        refreshKeys: { privateKey: string; publicKey: string }
    ): void {
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

        let envContent = fs.readFileSync(envPath, 'utf8');

        const envUpdates = [
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
        ];

        for (const { key, value } of envUpdates) {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        }

        fs.writeFileSync(envPath, envContent);

        try {
            fs.chmodSync(envPath, 0o600);
        } catch {
            console.warn(`Could not set permissions for ${envPath}`);
        }

        console.log('📝 .env file updated with new keys and KIDs');
    }
}

function main(): void {
    const argv = process.argv.slice(2);

    const directInsertIndex = argv.indexOf('--direct-insert');
    const useDirectInsert = directInsertIndex !== -1;

    const command = argv.find(arg => !arg.startsWith('--')) || 'generate';

    const keyDir = path.join(process.cwd(), 'keys');

    const generator = new JwtKeysGenerator(keyDir);

    if (command === 'generate') {
        generator.generateKeys(useDirectInsert);
    } else {
        console.log(`
Usage: node generate-keys.js [command] [options]

Commands:
  generate    Generate JWT keys (ES256 for access tokens, ES512 for refresh tokens) and JWKS with outputs:
              1. Save keys to ./keys directory as PEM files (always)
              2. Create separate access/refresh JWKS files (always)
              3. Update .env with keys and KIDs (only with --direct-insert flag)
              Key material is never printed to the console; only file paths and KIDs are shown.

Options:
  --direct-insert   [OPTIONAL] Enable automatic .env file update
                    By default, .env is NOT updated automatically for safety
                    Use this flag when you want keys inserted directly into .env

Examples:
  # Default behavior - NO .env update (keys written to ./keys only)
  pnpm generate:keys
  node generate-keys.js generate

  # Auto-update .env file - keys inserted automatically
  pnpm generate:keys --direct-insert
  node generate-keys.js generate --direct-insert
        `);
    }
}

/**
 * CLI entry point.
 */
main();
