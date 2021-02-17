import { readFileSync } from 'fs';
import yaml from 'js-yaml';

const YAML_CONFIG_FILENAME = 'config.yml';

export default (): Record<string, any> => {
    const configs: Record<string, any> = yaml.load(
        readFileSync(YAML_CONFIG_FILENAME, 'utf8')
    ) as Record<string, any>;
    return configs;
};
