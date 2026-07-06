import "@testing-library/jest-dom";

// react-native-web's runtime reads __DEV__; define it before any RN import.
(globalThis as { __DEV__?: boolean }).__DEV__ = false;
