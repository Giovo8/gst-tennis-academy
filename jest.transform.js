// Compila i test con il compilatore TypeScript (già tra le dipendenze) invece che con SWC di Next:
// su Windows con Smart App Control il binario nativo di SWC viene bloccato e in Next 16 Jest
// non ripiega sulla versione WASM. Solo traspilazione, senza type check (come SWC).
// Jest carica i trasformatori come CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ts = require('typescript');

module.exports = {
  process(sourceText, sourcePath) {
    const { outputText } = ts.transpileModule(sourceText, {
      fileName: sourcePath,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowJs: true,
      },
    });
    return { code: outputText };
  },
};
