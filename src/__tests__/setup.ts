import '@testing-library/jest-dom';

// react-native-web's runtime reads __DEV__; define it before any RN import.
// Reflect.set writes the global without an `as` cast or a conflicting redeclare
// (RN's types already declare __DEV__, so a local `declare global` clashes).
Reflect.set(globalThis, '__DEV__', false);
