import fs from 'node:fs';

const adminRoutePath = 'app/api/admin/route.ts';
const workflowPath = '.github/workflows/one-time-finalize-security.yml';
const selfPath = 'scripts/finalize-security.mjs';

let adminRoute = fs.readFileSync(adminRoutePath, 'utf8');

const oldImport = "import { AdminAccessError, requireAdmin } from '@/lib/admin-auth';";
const newImport = "import { AdminAccessError, requireAdmin, requireSameOriginAdminMutation } from '@/lib/admin-auth';";

if (adminRoute.includes(oldImport)) {
  adminRoute = adminRoute.replace(oldImport, newImport);
} else if (!adminRoute.includes('requireSameOriginAdminMutation')) {
  throw new Error('Import administrativo esperado não foi encontrado.');
}

const postStart = "export async function POST(request: Request) {\n  try {\n    const admin = await requireAdmin();";
const hardenedPostStart = "export async function POST(request: Request) {\n  try {\n    requireSameOriginAdminMutation(request);\n    const admin = await requireAdmin();";

if (adminRoute.includes(postStart)) {
  adminRoute = adminRoute.replace(postStart, hardenedPostStart);
} else if (!adminRoute.includes('requireSameOriginAdminMutation(request);')) {
  throw new Error('Início do POST administrativo esperado não foi encontrado.');
}

fs.writeFileSync(adminRoutePath, adminRoute);

for (const path of [workflowPath, selfPath]) {
  if (fs.existsSync(path)) fs.rmSync(path);
}

console.log('Admin POST hardened with explicit same-origin JSON enforcement.');
