import * as fs from 'node:fs';

import Package from '../package.json' with { type: 'json' };

fs.writeFileSync(
  'src/cli/version.ts',
  `export const version = '${Package.version}';\n`,
);
