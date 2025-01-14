import { autoinject } from "aurelia-framework";
import { Router } from "aurelia-router";
import { bindable } from "aurelia-typed-observable-plugin";
import { Utils } from "services/utils";
import "./navbar.scss";

@autoinject
export class Navbar {
  @bindable.booleanAttr vertical: boolean;
  @bindable onNavigate?: () => void;

  constructor(private router: Router) {}


  goto(url: string): void {
    Utils.goto(url);
  }

  navigate(href: string): void {
    if (this.onNavigate) {
      this.onNavigate();
    }
    this.router.navigate(href);
  }
}
