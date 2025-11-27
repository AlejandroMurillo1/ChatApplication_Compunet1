export class Router {
  constructor(root, routes) {
    this.root = root;
    this.routes = routes;
    window.onpopstate = () => this.load(window.location.pathname);
  }

  navigateTo(path) {
    history.pushState({}, "", path);
    this.load(path);
  }

  load(path) {
    const route = this.routes.find(r => r.path === path);
    if (route) {
      this.root.innerHTML = "";
      const page = new route.component(this);
      const renderedPage = page.render();

      if (renderedPage instanceof Node) {
        this.root.appendChild(renderedPage);
      } else {
        console.error(`Router Error: Component ${route.component.name} failed to return a valid DOM Node. Received:`, renderedPage);
      }
    }
  }
}
