const fs = require('fs');
const path = require('path');

const TARGETS = Object.freeze({
  development: { environment: 'staging', projectRef: 'ghxcditmnognoeiqlisn' },
  production: { environment: 'production', projectRef: 'mzfmwwxxocereizxmwqy' },
});

const SUPABASE_KEYS = [
  'REACT_APP_ENVIRONMENT',
  'REACT_APP_SUPABASE_PROJECT_REF',
  'REACT_APP_SUPABASE_URL',
  'REACT_APP_SUPABASE_ANON_KEY',
];

function parseEnv(source) {
  return source.split(/\r?\n/).reduce((values, line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) return values;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
    return values;
  }, {});
}

function envFilesFor(nodeEnv) {
  return [`.env.${nodeEnv}.local`, '.env.local', `.env.${nodeEnv}`, '.env'];
}

function loadEffectiveEnv(nodeEnv, root = process.cwd(), base = process.env) {
  const effective = { ...base };
  for (const file of envFilesFor(nodeEnv)) {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) continue;
    const values = parseEnv(fs.readFileSync(fullPath, 'utf8'));
    for (const [key, value] of Object.entries(values)) {
      if (!Object.prototype.hasOwnProperty.call(effective, key)) effective[key] = value;
    }
  }
  return effective;
}

function projectRefFromUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname.endsWith('.supabase.co') ? hostname.split('.')[0] : '';
  } catch {
    return '';
  }
}

function validateSupabaseTarget(nodeEnv, effective, root = process.cwd()) {
  const expected = TARGETS[nodeEnv];
  if (!expected) throw new Error(`Unsupported Supabase target environment: ${nodeEnv}`);

  const sharedLocalPath = path.join(root, '.env.local');
  if (fs.existsSync(sharedLocalPath)) {
    const shared = parseEnv(fs.readFileSync(sharedLocalPath, 'utf8'));
    if (SUPABASE_KEYS.some(key => shared[key])) {
      throw new Error('Ambiguous Supabase configuration: move Supabase variables from .env.local to an environment-specific .env.<environment>.local file.');
    }
  }

  const missing = SUPABASE_KEYS.filter(key => !effective[key]);
  if (missing.length) throw new Error(`Missing required ${nodeEnv} Supabase configuration: ${missing.join(', ')}`);

  const urlProjectRef = projectRefFromUrl(effective.REACT_APP_SUPABASE_URL);
  if (!urlProjectRef) throw new Error('REACT_APP_SUPABASE_URL must be a valid hosted Supabase project URL.');
  if (effective.REACT_APP_SUPABASE_PROJECT_REF !== expected.projectRef || urlProjectRef !== expected.projectRef) {
    throw new Error(`Contradictory ${nodeEnv} Supabase target. Expected project ${expected.projectRef}; check the URL and project-ref variables.`);
  }
  if (effective.REACT_APP_ENVIRONMENT !== expected.environment) {
    throw new Error(`Contradictory environment label. Expected REACT_APP_ENVIRONMENT=${expected.environment}.`);
  }
  if (/^sb_secret_/i.test(effective.REACT_APP_SUPABASE_ANON_KEY)) {
    throw new Error('A secret Supabase key must never be exposed through REACT_APP_SUPABASE_ANON_KEY.');
  }
  return expected;
}

function run(nodeEnv = process.argv[2]) {
  const effective = loadEffectiveEnv(nodeEnv);
  const target = validateSupabaseTarget(nodeEnv, effective);
  process.stdout.write(`Supabase target verified: ${target.environment} (${target.projectRef}) for ${nodeEnv}.\n`);
}

if (require.main === module) {
  try { run(); } catch (error) { process.stderr.write(`Supabase configuration error: ${error.message}\n`); process.exitCode = 1; }
}

module.exports = { TARGETS, envFilesFor, loadEffectiveEnv, parseEnv, projectRefFromUrl, validateSupabaseTarget };
