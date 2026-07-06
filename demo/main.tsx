import { AppRegistry } from "react-native";
import { App } from "./App";

// react-native-web renders through AppRegistry so its StyleSheet registry
// injects the generated CSS into the document head.
AppRegistry.registerComponent("TelephoneDemo", () => App);
AppRegistry.runApplication("TelephoneDemo", {
  rootTag: document.getElementById("root"),
});
