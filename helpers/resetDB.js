import { readdir, writeFile } from 'fs/promises'

const _path = "C:\\Users\\Pichau\\OneDrive\\Área de Trabalho\\Projects\\NodeChat\\database";
(await readdir(_path)).forEach(file => writeFile(`${_path}\\${file}`, file == "logs.json" ? '[]' : '{}'))