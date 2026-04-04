// ════════════════════════════════════════════════════════════════
//  PALETTES
// ════════════════════════════════════════════════════════════════
export const PALETTES = [
  // ── Human — light tones
  { hair:'#7aa2f7', skin:'#f5c2a0', shirt:'#2a5faa', pants:'#1e2a50', accent:'#7aa2f7' },
  { hair:'#bb9af7', skin:'#f5c2a0', shirt:'#7a3fbb', pants:'#2a1850', accent:'#bb9af7' },
  { hair:'#9ece6a', skin:'#eec98a', shirt:'#3a7a1e', pants:'#1a2e0e', accent:'#9ece6a' },
  { hair:'#ff9e64', skin:'#f5c2a0', shirt:'#bb4a10', pants:'#2a1408', accent:'#ff9e64' },
  { hair:'#f7768e', skin:'#f5d0a9', shirt:'#992244', pants:'#220e18', accent:'#f7768e' },
  { hair:'#2ac3de', skin:'#f5c2a0', shirt:'#0e6a80', pants:'#071e28', accent:'#2ac3de' },
  // ── Human — medium/tan tones
  { hair:'#4a2810', skin:'#c8825a', shirt:'#2a60a0', pants:'#0e1e3c', accent:'#7aa2f7' },
  { hair:'#e0af68', skin:'#c8905a', shirt:'#7a5a20', pants:'#2e2008', accent:'#e0af68' },
  { hair:'#8a4820', skin:'#d09060', shirt:'#c05020', pants:'#281408', accent:'#ff9e64' },
  // ── Human — dark tones
  { hair:'#1a0c04', skin:'#3d1f0a', shirt:'#c03030', pants:'#180808', accent:'#f7768e' },
  { hair:'#280808', skin:'#5a2c10', shirt:'#208060', pants:'#0a2418', accent:'#9ece6a' },
  { hair:'#a9b1d6', skin:'#2a2040', shirt:'#3a4068', pants:'#1a1e38', accent:'#a9b1d6' },
  // ── Fantasy — Elf (pointed ears, fair)
  { hair:'#e8d880', skin:'#f0e8c8', shirt:'#2a6838', pants:'#1a3020', accent:'#9ece6a', elf:true },
  // ── Fantasy — Elf (dark, silver hair)
  { hair:'#c8d0f0', skin:'#d0c8e8', shirt:'#3a2868', pants:'#1a1438', accent:'#bb9af7', elf:true },
  // ── Fantasy — Alien (blue skin, big eyes)
  { hair:'#80a0ff', skin:'#a0c0e8', shirt:'#183060', pants:'#0a1428', accent:'#2ac3de', alien:true },
  // ── Fantasy — Neko / Cat-person
  { hair:'#e0a060', skin:'#f0c890', shirt:'#804030', pants:'#281810', accent:'#ff9e64', cat:true },
  // ── Fantasy — Demon (red skin, horns)
  { hair:'#800000', skin:'#c05040', shirt:'#380010', pants:'#180008', accent:'#f7768e', demon:true },
  // ── Fantasy — Robot / Android (metallic)
  { hair:'#60c0d0', skin:'#8090a8', shirt:'#204060', pants:'#101828', accent:'#2ac3de', robot:true },
];
export function getPalette(slug) {
  let h = 0;
  for (const c of slug) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  const ah = Math.abs(h);
  const base = PALETTES[ah % PALETTES.length];
  const isFantasy = !!(base.alien || base.elf || base.cat || base.demon || base.robot);
  return {
    ...base,
    glasses:    !isFantasy && ah%5===0,
    beard:      !isFantasy && ah%7===1,
    bun:        base.bun || (!isFantasy && ah%6===2),
    hat:        !isFantasy && ah%9===3,
    scarf:      !isFantasy && ah%8===0,
    fatigue:    ah%4===0,
    couchStyle: ah%4,
  };
}

// ════════════════════════════════════════════════════════════════
//  ROLES  (short role label based on agent type / slug)
// ════════════════════════════════════════════════════════════════
export const AGENT_TYPE_ROLES = {
  'developer':        'Dev',
  'researcher':       'Research',
  'tester':           'Tester',
  'debugger':         'Debug',
  'worker':           'Worker',
  'boss':             'Boss',
  'Explore':          'Scout',
  'Plan':             'Planner',
  'general-purpose':  'Claude',
  'claude-code-guide':'Guide',
  'statusline-setup': 'Config',
  'simplify':         'Refactor',
};
export const SLUG_KEYWORDS = [
  ['developer','Dev'],['builder','Builder'],['build','Builder'],
  ['tester','Tester'],['test','Tester'],['debugger','Debug'],['debug','Debug'],
  ['researcher','Research'],['research','Research'],['analyz','Analyst'],
  ['planner','Planner'],['plan','Planner'],['architect','Architect'],
  ['worker','Worker'],['boss','Boss'],['scout','Scout'],['explore','Scout'],
  ['writer','Writer'],['write','Writer'],['coder','Coder'],['code','Coder'],
  ['reviewer','Review'],['review','Review'],['design','Design'],
  ['fix','Fixer'],['refactor','Refactor'],['dashboard','UI'],
];
export function getRole(agentData) {
  const type = agentData?.agentType;
  if (type && AGENT_TYPE_ROLES[type]) return AGENT_TYPE_ROLES[type];
  if (type) return type.split(/[-_]/)[0].slice(0,7);
  const slug = (agentData?.slug || '').toLowerCase();
  for (const [kw, role] of SLUG_KEYWORDS) {
    if (slug.includes(kw)) return role;
  }
  return 'Claude';
}
