import { hasRole } from "./roles";

export function redirectAfterAuth(navigate) {
  if (hasRole("SUPER_ADMIN", "ADMIN")) {
    navigate("/dashboard", { replace: true });
    return;
  }
  if (hasRole("USER")) {
    navigate("/solr-cluster", { replace: true });
    return;
  }
  navigate("/account", { replace: true });
}
