import * as fs from 'node:fs';

import Package from '../package.json' with { type: 'json' };

fs.writeFileSync(
  'src/version.ts',
  `export const version = '${Package.version}';\n`,
);
