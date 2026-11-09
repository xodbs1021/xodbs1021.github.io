import fs from 'node:fs';
import {tokensCss} from '../src/lib/tokens.mjs';

fs.writeFileSync('src/styles/tokens.css', tokensCss());
