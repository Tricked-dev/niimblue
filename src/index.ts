import "./app.css";
import "toastify-js/src/toastify.css";
import App from "$/App.svelte";
import { mount } from "svelte";
import { configureFabric } from "$/defaults";
import { Datamatrix } from "$/fabric-object/datamatrix";
import * as fabric from "fabric";

configureFabric();
fabric.classRegistry.setClass(Datamatrix, "Datamatrix");

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
