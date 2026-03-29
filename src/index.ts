import "./app.css";
import "toastify-js/src/toastify.css";
import App from "$/App.svelte";
import { mount } from "svelte";
import { configureFabric } from "$/defaults";

configureFabric();

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
