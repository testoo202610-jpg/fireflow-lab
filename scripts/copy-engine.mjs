import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('public', {recursive: true});
copyFileSync('node_modules/epanet-js/dist/engines/v2.2/EpanetEngine.wasm', 'public/epanet-2.2.wasm');
