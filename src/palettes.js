// ════════════════════════════════════════════════════════════════
//  PALETTES
// ════════════════════════════════════════════════════════════════
export const PALETTES = [
  // ── Human — light tones
  {
    hair: '#7aa2f7',
    skin: '#f5c2a0',
    shirt: '#2a5faa',
    pants: '#1e2a50',
    accent: '#7aa2f7',
  },
  {
    hair: '#bb9af7',
    skin: '#f5c2a0',
    shirt: '#7a3fbb',
    pants: '#2a1850',
    accent: '#bb9af7',
  },
  {
    hair: '#9ece6a',
    skin: '#eec98a',
    shirt: '#3a7a1e',
    pants: '#1a2e0e',
    accent: '#9ece6a',
  },
  {
    hair: '#ff9e64',
    skin: '#f5c2a0',
    shirt: '#bb4a10',
    pants: '#2a1408',
    accent: '#ff9e64',
  },
  {
    hair: '#f7768e',
    skin: '#f5d0a9',
    shirt: '#992244',
    pants: '#220e18',
    accent: '#f7768e',
  },
  {
    hair: '#2ac3de',
    skin: '#f5c2a0',
    shirt: '#0e6a80',
    pants: '#071e28',
    accent: '#2ac3de',
  },
  // ── Human — medium/tan tones
  {
    hair: '#4a2810',
    skin: '#c8825a',
    shirt: '#2a60a0',
    pants: '#0e1e3c',
    accent: '#7aa2f7',
  },
  {
    hair: '#e0af68',
    skin: '#c8905a',
    shirt: '#7a5a20',
    pants: '#2e2008',
    accent: '#e0af68',
  },
  {
    hair: '#8a4820',
    skin: '#d09060',
    shirt: '#c05020',
    pants: '#281408',
    accent: '#ff9e64',
  },
  // ── Human — dark tones
  {
    hair: '#1a0c04',
    skin: '#3d1f0a',
    shirt: '#c03030',
    pants: '#180808',
    accent: '#f7768e',
  },
  {
    hair: '#280808',
    skin: '#5a2c10',
    shirt: '#208060',
    pants: '#0a2418',
    accent: '#9ece6a',
  },
  {
    hair: '#a9b1d6',
    skin: '#2a2040',
    shirt: '#3a4068',
    pants: '#1a1e38',
    accent: '#a9b1d6',
  },
  // ── Fantasy — Elf (pointed ears, fair)
  {
    hair: '#e8d880',
    skin: '#f0e8c8',
    shirt: '#2a6838',
    pants: '#1a3020',
    accent: '#9ece6a',
    elf: true,
  },
  // ── Fantasy — Elf (dark, silver hair)
  {
    hair: '#c8d0f0',
    skin: '#d0c8e8',
    shirt: '#3a2868',
    pants: '#1a1438',
    accent: '#bb9af7',
    elf: true,
  },
  // ── Fantasy — Alien (blue skin, big eyes)
  {
    hair: '#80a0ff',
    skin: '#a0c0e8',
    shirt: '#183060',
    pants: '#0a1428',
    accent: '#2ac3de',
    alien: true,
  },
  // ── Fantasy — Neko / Cat-person
  {
    hair: '#e0a060',
    skin: '#f0c890',
    shirt: '#804030',
    pants: '#281810',
    accent: '#ff9e64',
    cat: true,
  },
  // ── Fantasy — Demon (red skin, horns)
  {
    hair: '#800000',
    skin: '#c05040',
    shirt: '#380010',
    pants: '#180008',
    accent: '#f7768e',
    demon: true,
  },
  // ── Fantasy — Robot / Android (metallic)
  {
    hair: '#60c0d0',
    skin: '#8090a8',
    shirt: '#204060',
    pants: '#101828',
    accent: '#2ac3de',
    robot: true,
  },
  // ── Extended human palettes ────────────────────────────────────
  {
    hair: '#5c3c1c',
    skin: '#e8b080',
    shirt: '#1a4030',
    pants: '#0c1e18',
    accent: '#50c078',
  },
  {
    hair: '#d08040',
    skin: '#f0c890',
    shirt: '#604080',
    pants: '#281438',
    accent: '#b060e8',
  },
  {
    hair: '#202040',
    skin: '#c89070',
    shirt: '#8a3020',
    pants: '#2a1008',
    accent: '#e08050',
  },
  {
    hair: '#607090',
    skin: '#e0c0a0',
    shirt: '#306060',
    pants: '#102828',
    accent: '#60c0a0',
  },
  {
    hair: '#a02060',
    skin: '#f0d0b0',
    shirt: '#1a3060',
    pants: '#0a1830',
    accent: '#ff60a0',
  },
  {
    hair: '#e8e8f0',
    skin: '#f0c0a0',
    shirt: '#202838',
    pants: '#0a1018',
    accent: '#a0b0d0',
  },
  // ── Extra fantasy variations ───────────────────────────────────
  // Bright green elf — archer vibe
  {
    hair: '#a8d84c',
    skin: '#e8d0a8',
    shirt: '#205830',
    pants: '#0c2018',
    accent: '#c0e060',
    elf: true,
  },
  // Crimson demon — darker blood-red
  {
    hair: '#2a0000',
    skin: '#802020',
    shirt: '#1a0404',
    pants: '#0a0202',
    accent: '#ff4020',
    demon: true,
  },
  // Neon-pink robot
  {
    hair: '#ff60c0',
    skin: '#a090b0',
    shirt: '#301840',
    pants: '#18081c',
    accent: '#ff40a0',
    robot: true,
  },
  // Violet cat
  {
    hair: '#a040c0',
    skin: '#f0d0e0',
    shirt: '#201838',
    pants: '#0c0818',
    accent: '#d060ff',
    cat: true,
  },
  // Emerald alien
  {
    hair: '#60d0a0',
    skin: '#a0d0b0',
    shirt: '#104028',
    pants: '#06180c',
    accent: '#60ffb0',
    alien: true,
  },
];

// Slug-specific palette overrides — named agents that should always look the same,
// regardless of hash bucket. Add entries here to pin a unique sprite to a slug.
export const SLUG_PALETTES = {
  // Flabber — personal assistant on local Gemma. Unique gold-and-purple android look.
  flabber: {
    hair: '#e8c040',
    skin: '#c8b090',
    shirt: '#4a2080',
    pants: '#2a1048',
    accent: '#e8c040',
    robot: true,
  },
  // Content bot — teal neko (cat-person) with friendly orange accents.
  content: {
    hair: '#20c0a0',
    skin: '#f0d4b0',
    shirt: '#c85020',
    pants: '#2a1810',
    accent: '#20c0a0',
    cat: true,
  },
};

export function getPalette(slug, id) {
  // Prefer hashing on id when available — two agents with identical slugs
  // ("ai", "ai/Explore") must still look different. Slug-based overrides
  // (flabber, content) still match the slug first.
  const key = (id || slug || '?') + '';
  const override = SLUG_PALETTES[slug?.toLowerCase?.()];
  let h = 0;
  for (const c of key) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  const ah = Math.abs(h);
  const base = override || PALETTES[ah % PALETTES.length];
  const isFantasy = !!(base.alien || base.elf || base.cat || base.demon || base.robot);
  return {
    ...base,
    glasses: !isFantasy && ah % 5 === 0,
    beard: !isFantasy && ah % 7 === 1,
    bun: base.bun || (!isFantasy && ah % 6 === 2),
    hat: !isFantasy && ah % 9 === 3,
    scarf: !isFantasy && ah % 8 === 0,
    fatigue: ah % 4 === 0,
    couchStyle: ah % 4,
  };
}

// ════════════════════════════════════════════════════════════════
//  DISPLAY NAMES — one unique name per agent, pulled from a bank
// ════════════════════════════════════════════════════════════════
// Canonical names for slug-locked personas. These ALWAYS win.
export const SLUG_NAMES = {
  flabber: 'Flabber',
  content: 'Content Manager',
};

// 96 short, single-word names. Mixed-style, friendly, easy to read on the map.
const NAME_BANK = [
  'Alex',
  'Bella',
  'Cassie',
  'Diego',
  'Echo',
  'Finn',
  'Gina',
  'Hugo',
  'Iris',
  'Jules',
  'Kai',
  'Luna',
  'Milo',
  'Nico',
  'Olive',
  'Piper',
  'Quinn',
  'Riley',
  'Sage',
  'Theo',
  'Uma',
  'Vince',
  'Wren',
  'Xena',
  'Yara',
  'Zane',
  'Aria',
  'Bex',
  'Cleo',
  'Dex',
  'Ellie',
  'Frank',
  'Greta',
  'Hank',
  'Ivy',
  'Jax',
  'Kora',
  'Leo',
  'Mae',
  'Nash',
  'Opal',
  'Pax',
  'Rue',
  'Sky',
  'Tate',
  'Uri',
  'Vee',
  'Wes',
  'Xyla',
  'Yuki',
  'Zeke',
  'Ari',
  'Blaze',
  'Cora',
  'Dax',
  'Ember',
  'Flint',
  'Gwen',
  'Hale',
  'Izzy',
  'Jace',
  'Kaya',
  'Lex',
  'Maze',
  'Nora',
  'Orin',
  'Pixi',
  'Remy',
  'Sora',
  'Tess',
  'Vega',
  'Wick',
  'Zara',
  'Bryn',
  'Caden',
  'Delia',
  'Ezra',
  'Fay',
  'Gus',
  'Hazel',
  'Indy',
  'Juno',
  'Knox',
  'Lila',
  'Moss',
  'Nyx',
  'Otis',
  'Poppy',
  'Reese',
  'Soren',
  'Thora',
  'Ula',
  'Vik',
  'Wade',
  'Xander',
  'Yanni',
];

// Known agent types get a single-char badge we append after the name
// (e.g. "Luna·S" for a Scout). Keeps the one-line label readable.
const TYPE_BADGE = {
  developer: 'D',
  researcher: 'R',
  tester: 'T',
  debugger: 'X',
  worker: 'W',
  boss: 'B',
  Explore: 'S',
  Plan: 'P',
  'general-purpose': 'C',
  'claude-code-guide': 'G',
  'statusline-setup': 'K',
  simplify: 'R',
};

function _stringHash(s) {
  let h = 0;
  for (const c of s) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

// Thematic, slightly comic name pools keyed by agentType / slug keyword.
// Stable per-agent via hash(id). Resolved BEFORE the generic NAME_BANK fallback.
const TYPE_NAMES = {
  developer: [
    'Code Cody',
    'Bugsly',
    'Hackson',
    'Pusha',
    'Merge',
    'Forky',
    'Commit',
    'Patchy',
    'Stash',
    'Refactor',
  ],
  'qa-engineer': [
    'Testy',
    'Bug-Hunt',
    'Assert',
    'Coverage',
    'Flaky',
    'Failsworth',
    'Expecto',
    'Catchy',
  ],
  tester: ['Testy', 'Flaky', 'Passer', 'Assert', 'Expecto'],
  debugger: ['Sleuth', 'Heisen', 'Tracer', 'Stacky', 'GDB', 'Breakpoint', 'Catchblock'],
  architect: ['Blueprint', 'Vitruvius', 'Layers', 'Pillar', 'Monolith', 'Arches'],
  reviewer: ['Nitpick', 'LGTM', 'Approverson', 'Nay', 'Blocky', 'Critique'],
  'devops-automator': ['Pipeline', 'Kube', 'Docker', 'Deployson', 'YAMLy', 'CI-CI', 'Terra'],
  'security-engineer': ['Firewall', 'Zero-Day', 'CVE', 'Shield', 'Lockie', 'Pentest', 'SQLyn'],
  'performance-engineer': ['Turbo', 'Flame', 'Profiler', 'Latency', 'GC-Man', 'Flamegraf'],
  'technical-writer': ['Inky', 'Markdown', 'Scribe', 'Docson', 'README', 'Tildy'],
  'ux-designer': ['Pixie', 'Figmar', 'Wirely', 'Gridna', 'Kerning'],
  'brand-identity-designer': ['Logo', 'Palette', 'Swatchy', 'Kerny'],
  '3d-scene-designer': ['Mesh', 'Vertex', 'Shader', 'Raymarch'],
  'ollama-expert': ['Ollie', 'Gemma', 'Quant', 'Mod-file'],
  'prompt-engineer': ['Prompto', 'System', 'Cachy', 'Tokenly'],
  'telegram-bot-expert': ['Grammy', 'Webhooky', 'Bot-Tim', 'InlineIvan'],
  'chrome-extension-expert': ['Manifest', 'ServiceWork', 'ChromeO', 'V3'],
  'prisma-expert': ['Schemo', 'Migro', 'N-plus-One', 'Prismo'],
  'supabase-expert': ['RLS', 'Edgy', 'Realto', 'Postgresi'],
  'content-creator': ['Scroller', 'Caption', 'Hooky', 'Viral'],
  'instagram-curator': ['Gridlord', 'Reely', 'Hashtaga', 'Story'],
  'carousel-growth-engine': ['Swipy', 'Slider', 'Saver', 'Reach'],
  'image-prompt-engineer': ['Fluxer', 'Midji', 'Diffuse', 'Pixelo'],
  'visual-storyteller': ['Panel', 'Frame', 'Storybo'],
  'seo-specialist': ['Meta-Mo', 'OG-Tag', 'Sitemap', 'Crawly'],
  'accessibility-tester': ['A11y', 'ARIA', 'TabOrd', 'Readeron'],
  'api-tester': ['CURLy', 'Postman', 'Fetchy', '429'],
  'business-analyst': ['Story-Po', 'Acceptco', 'Criterio'],
  'product-manager': ['Roadma', 'PRDenis', 'Sprintly', 'Stakes'],
  'ux-designer-alt': ['Flowy', 'Mock-Mo', 'Jonah-UI'],
  'motion-designer': ['Easey', 'Framy', 'Spring'],
  'dependency-manager': ['NPM-Nate', 'Lockfi', 'SemVer', 'Audit-A'],
  'git-workflow-manager': ['Rebase', 'Squashy', 'Branchy', 'HEAD~1'],
  'refactoring-specialist': ['Extracto', 'DRY-Dan', 'Simpli'],
  'n8n-editor': ['Nodey', 'Trigger', 'Flowt'],
  debugger_alt: ['Heisen', 'Tracer', 'Stacky'],
  researcher: ['Scholar', 'Footnote', 'Citely'],
  worker: ['Beaver', 'Grindy', 'Crunchy', 'Hustle'],
  boss: ['Stonks', 'Synergy', 'Quarterly', 'Chief', 'C-Suite'],
  Explore: ['Scouty', 'Recon', 'Path-Find', 'Snoop'],
  Plan: ['Gantt', 'Roadma', 'Checkli', 'Outliny'],
  'general-purpose': ['Swisso', 'Utili', 'Jack', 'Multi', 'Handy', 'Everyto', 'Omni'],
  'claude-code-guide': ['Guidy', 'Manualo', 'Helpy'],
  'statusline-setup': ['Configo', 'Promptly', 'Statso'],
  simplify: ['DRY-Dan', 'Trimmy', 'Slim'],
  'performance-engineer_alt': ['Turbo', 'Flame'],
  'devops-automator_alt': ['Pipeline'],
  'dependency-manager_alt': ['NPM-Nate'],
};
// Slug-keyword fallback pools (when agentType missing — e.g. real Claude session by project slug)
const SLUG_NAME_POOLS = [
  [/content/i, TYPE_NAMES['content-creator']],
  [/(site|web|frontend|ui)/i, ['Pixie', 'Gridna', 'Stylesheet', 'Flexbo']],
  [/(bot|tg|telegram)/i, TYPE_NAMES['telegram-bot-expert']],
  [/(ext|chrome)/i, TYPE_NAMES['chrome-extension-expert']],
  [/(ollama|local|gemma|llama)/i, TYPE_NAMES['ollama-expert']],
  [/(dashboard|office|pixel)/i, ['Canvaso', 'Sprite', 'Tilemap', 'Grid-G']],
  [/(game|heroes|random)/i, ['Dice-D', 'Randy', 'Rollo']],
  [/(cover|letter|resume)/i, ['Hireson', 'Resumo', 'Coverly']],
  [/(course|edu|learn)/i, ['Syllabo', 'Rubric', 'Homework']],
  [/(apex|track)/i, ['Trackson', 'Metric', 'Logger']],
  [/(assistant|helper|flabber)/i, ['Flabber', 'Helpy', 'Utili']],
];

// Pick a stable unique display name for an agent.
export function getDisplayName(agentData) {
  if (!agentData) return '';
  const slug = (agentData.slug || '').toLowerCase();
  // 1) Canonical slug overrides always win
  for (const key of Object.keys(SLUG_NAMES)) {
    if (slug.includes(key)) return SLUG_NAMES[key];
  }
  const id = agentData.id || slug || '?';
  const hash = _stringHash(id);
  const type = agentData.agentType;
  const badge = type && TYPE_BADGE[type] ? `·${TYPE_BADGE[type]}` : '';

  // 2) Thematic pool by agentType
  if (type && TYPE_NAMES[type]) {
    const pool = TYPE_NAMES[type];
    return pool[hash % pool.length] + badge;
  }
  // 3) Thematic pool by slug keyword (for real Claude sessions without meta.agentType)
  for (const [re, pool] of SLUG_NAME_POOLS) {
    if (re.test(slug)) return pool[hash % pool.length] + badge;
  }
  // 4) Unknown type — comic "fresh arrival" pool so the label still feels intentional
  const UNKNOWN_POOL = [
    'Newbie',
    'Rando',
    'Anon',
    'Mystery',
    'Rookie',
    'Freshy',
    'Nobody',
    'Wildcard',
    'TBD',
    'Undefined',
    'NaN',
    'Blanky',
    'TempBot',
    'Greenie',
    'Stranger',
    'Nameless',
  ];
  return UNKNOWN_POOL[hash % UNKNOWN_POOL.length] + badge;
}

// ════════════════════════════════════════════════════════════════
//  ROLES  (short role label based on agent type / slug)
// ════════════════════════════════════════════════════════════════
export const AGENT_TYPE_ROLES = {
  developer: 'Dev',
  researcher: 'Research',
  tester: 'Tester',
  debugger: 'Debug',
  worker: 'Worker',
  boss: 'Boss',
  Explore: 'Scout',
  Plan: 'Planner',
  'general-purpose': 'Claude',
  'claude-code-guide': 'Guide',
  'statusline-setup': 'Config',
  simplify: 'Refactor',
};
export const SLUG_KEYWORDS = [
  ['developer', 'Dev'],
  ['builder', 'Builder'],
  ['build', 'Builder'],
  ['tester', 'Tester'],
  ['test', 'Tester'],
  ['debugger', 'Debug'],
  ['debug', 'Debug'],
  ['researcher', 'Research'],
  ['research', 'Research'],
  ['analyz', 'Analyst'],
  ['planner', 'Planner'],
  ['plan', 'Planner'],
  ['architect', 'Architect'],
  ['worker', 'Worker'],
  ['boss', 'Boss'],
  ['scout', 'Scout'],
  ['explore', 'Scout'],
  ['writer', 'Writer'],
  ['write', 'Writer'],
  ['coder', 'Coder'],
  ['code', 'Coder'],
  ['reviewer', 'Review'],
  ['review', 'Review'],
  ['design', 'Design'],
  ['fix', 'Fixer'],
  ['refactor', 'Refactor'],
  ['dashboard', 'UI'],
  ['flabber', 'Flabber'],
  ['assistant', 'Flabber'],
  ['content', 'Content Manager'],
];
export function getRole(agentData) {
  const type = agentData?.agentType;
  if (type && AGENT_TYPE_ROLES[type]) return AGENT_TYPE_ROLES[type];
  if (type) return type.split(/[-_]/)[0].slice(0, 7);
  const slug = (agentData?.slug || '').toLowerCase();
  for (const [kw, role] of SLUG_KEYWORDS) {
    if (slug.includes(kw)) return role;
  }
  return 'Claude';
}
