import type { RoleName } from "./rbac";

export const ROLE_LABELS: Record<RoleName, string> = {
  OWNER: "Inhaber",
  ADMIN: "Administration",
  DISPATCHER: "Disposition",
  OFFICE: "Büro",
  DRIVER: "Fahrer",
  ACCOUNTING: "Buchhaltung",
  CONTENT_MANAGER: "Redaktion",
  CUSTOMER: "Kunde",
};
