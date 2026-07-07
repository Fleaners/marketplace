const fs = require('fs');
const path = require('path');

const targetFiles = [
  'next_app/app/(dashboard)/dashboard/ai-insights/page.tsx',
  'next_app/app/(dashboard)/dashboard/analytics/page.tsx',
  'next_app/app/(dashboard)/dashboard/inventory/page.tsx',
  'next_app/app/(dashboard)/dashboard/leads/page.tsx',
  'next_app/app/(dashboard)/dashboard/orders/page.tsx',
  'next_app/app/(dashboard)/dashboard/products/page.tsx',
  'next_app/app/(dashboard)/dashboard/products/new/page.tsx',
  'next_app/app/(dashboard)/dashboard/profile/page.tsx',
  'next_app/app/(dashboard)/dashboard/reviews/page.tsx',
  'next_app/app/(dashboard)/dashboard/settings/page.tsx',
];

const basePath = 'C:\\Users\\ELCOT\\Documents\\New folder\\marketplace';

const replacements = [
  // 1. Core Card Backgrounds (Dark slate/zinc -> premium clean white/cream)
  { regex: /bg-slate-950\/80/g, replacement: 'bg-white/80' },
  { regex: /bg-slate-950\/40/g, replacement: 'bg-white/40' },
  { regex: /bg-slate-950/g, replacement: 'bg-white' },
  { regex: /bg-zinc-950/g, replacement: 'bg-white' },
  { regex: /bg-slate-900\/60/g, replacement: 'bg-[#fff6e6]' },
  { regex: /bg-slate-900\/50/g, replacement: 'bg-[#fff6e6]' },
  { regex: /bg-slate-900\/40/g, replacement: 'bg-[#fff6e6]' },
  { regex: /bg-slate-900\/30/g, replacement: 'bg-[#fff6e6]' },
  { regex: /bg-slate-900\/20/g, replacement: 'bg-[#fff6e6]/50' },
  { regex: /bg-slate-900\/10/g, replacement: 'bg-[#fff0db]/50' },
  { regex: /bg-slate-900/g, replacement: 'bg-[#fff6e6]' },
  { regex: /bg-slate-800\/40/g, replacement: 'bg-[#fff6e6]/40' },
  
  // 2. Borders (Dark slate borders -> warm light gold borders)
  { regex: /border-slate-800\/80/g, replacement: 'border-[#f3d9a7]' },
  { regex: /border-slate-800\/60/g, replacement: 'border-[#f3d9a7]/60' },
  { regex: /border-slate-800/g, replacement: 'border-[#f3d9a7]' },
  { regex: /border-slate-900/g, replacement: 'border-[#f3d9a7]' },
  { regex: /divide-slate-900\/60/g, replacement: 'divide-[#f3d9a7]/60' },
  { regex: /divide-slate-900/g, replacement: 'divide-[#f3d9a7]' },
  { regex: /border-dashed border-slate-900/g, replacement: 'border-dashed border-[#f3d9a7]' },
  
  // 3. Typography (Light/White text on dark bg -> Charcoal text with ultra-high contrast)
  { regex: /text-white/g, replacement: 'text-[#1f2937]' },
  { regex: /text-slate-100/g, replacement: 'text-[#1f2937]' },
  { regex: /text-slate-200/g, replacement: 'text-slate-700' },
  { regex: /text-slate-300/g, replacement: 'text-slate-600' },
  { regex: /text-slate-400/g, replacement: 'text-slate-500' },
  { regex: /group-hover:text-accent-400/g, replacement: 'group-hover:text-amber-600' },
  { regex: /text-accent-400/g, replacement: 'text-amber-600' },
  
  // 4. Accent button elements / forms / widgets
  { regex: /accent-accent-500/g, replacement: 'accent-[#FAB12F]' },
  { regex: /bg-accent-500/g, replacement: 'bg-[#FAB12F]' },
  { regex: /hover:bg-accent-600/g, replacement: 'hover:bg-[#e09e1b]' },
  { regex: /hover:bg-slate-900/g, replacement: 'hover:bg-[#fff0db]' },
  
  // 5. Section specific fixes (e.g., in Profile/Onboarding checklists or specific headers)
  { regex: /from-accent-500\/10 via-slate-900 to-slate-950/g, replacement: 'from-[#FAB12F]/10 via-[#fff0db] to-[#fff6e6]' },
  { regex: /text-slate-800\/60/g, replacement: 'text-slate-300' },
];

targetFiles.forEach((relPath) => {
  const fullPath = path.join(basePath, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File does not exist: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;

  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Successfully redesigned: ${relPath}`);
  } else {
    console.log(`No changes needed for: ${relPath}`);
  }
});
