'use strict';

const { existsSync } = require('node:fs');
const path = require('node:path');

const PACKAGE_NAME = '@univerjs-pro/engine-formula-rust-binding';
const BINARY_NAME = 'univer-formula';
const MAIN_PACKAGE_VERSION = require('./package.json').version;
const TARGETS = new Map([
    ['darwin-arm64', 'darwin-arm64'],
    ['linux-x64', 'linux-x64-gnu'],
    ['linux-arm64', 'linux-arm64-gnu'],
    ['win32-x64', 'win32-x64-msvc'],
]);

function resolveTarget() {
    const platformArch = `${process.platform}-${process.arch}`;
    const target = TARGETS.get(platformArch);
    if (target === undefined) {
        throw new Error(`Unsupported ${PACKAGE_NAME} native target: ${platformArch}`);
    }
    if (target.endsWith('-gnu')) {
        const report = typeof process.report?.getReport === 'function' ? process.report.getReport() : undefined;
        if (!report?.header?.glibcVersionRuntime) {
            throw new Error(`Unsupported ${PACKAGE_NAME} Linux libc for ${platformArch}: glibc is required`);
        }
    }
    return target;
}

function loadNativeBinding() {
    if (process.env.NAPI_RS_NATIVE_LIBRARY_PATH) {
        return require(process.env.NAPI_RS_NATIVE_LIBRARY_PATH);
    }

    const target = resolveTarget();
    const localBindingPath = path.join(__dirname, `${BINARY_NAME}.${target}.node`);
    if (existsSync(localBindingPath)) {
        return require(localBindingPath);
    }

    const platformPackage = `${PACKAGE_NAME}-${target}`;
    const platformPackageVersion = require(`${platformPackage}/package.json`).version;
    if (platformPackageVersion !== MAIN_PACKAGE_VERSION) {
        throw new Error(
            `Native package version mismatch: ${PACKAGE_NAME}@${MAIN_PACKAGE_VERSION} requires ${platformPackage}@${MAIN_PACKAGE_VERSION}, installed ${platformPackageVersion}`,
        );
    }
    return require(platformPackage);
}

const nativeBinding = loadNativeBinding();

for (const exportName of ['formulaEngineExecute', 'formulaLexerTreeBuild']) {
    if (typeof nativeBinding[exportName] !== 'function') {
        throw new Error(`${PACKAGE_NAME} native binding is missing ${exportName}`);
    }
}

module.exports = nativeBinding;
