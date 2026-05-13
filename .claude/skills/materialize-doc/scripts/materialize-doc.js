#!/usr/bin/env node

/**
 * materialize-doc.js
 *
 * Transforms a workspace YAML artifact into a polished ClickUp Doc.
 *
 * Usage:
 *   node materialize-doc.js <yaml-path> [--task-id <clickup-task-id>] [--cf-id <custom-field-id>] [--parent-doc-id <clickup-doc-id>]
 *
 * Environment:
 *   ANTHROPIC_API_KEY  - Required for Claude API
 *   CLICKUP_API_KEY    - Required for ClickUp Docs API
 *   CLICKUP_TEAM_ID    - Required for ClickUp workspace
 *
 * @module materialize-doc
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { processText } = require('./fix-accents-module.js');

// ---------------------------------------------------------------------------
// 1. Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = { yamlPath: null, taskId: null, cfId: null, parentDocId: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--task-id' && args[i + 1]) {
      result.taskId = args[i + 1];
      i++;
    } else if (args[i] === '--cf-id' && args[i + 1]) {
      result.cfId = args[i + 1];
      i++;
    } else if (args[i] === '--parent-doc-id' && args[i + 1]) {
      result.parentDocId = args[i + 1];
      i++;
    } else if (!result.yamlPath && !args[i].startsWith('--')) {
      result.yamlPath = args[i];
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// 2. YAML reading (simple key extraction without external deps)
// ---------------------------------------------------------------------------

function extractMetadata(yamlContent) {
  const metadata = {
    version: null,
    state: null,
    owner: null,
    layer: null,
    last_updated: null,
    document_id: null,
    type: null,
    vocabulary: null,
  };

  const lines = yamlContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('version:')) metadata.version = trimmed.split(':').slice(1).join(':').trim().replace(/['"]/g, '');
    if (trimmed.startsWith('state:')) metadata.state = trimmed.split(':').slice(1).join(':').trim().replace(/['"]/g, '');
    if (trimmed.startsWith('owner:') || trimmed.startsWith('owner_squad:')) metadata.owner = trimmed.split(':').slice(1).join(':').trim().replace(/['"]/g, '');
    if (trimmed.startsWith('layer:')) metadata.layer = trimmed.split(':').slice(1).join(':').trim().replace(/['"]/g, '');
    if (trimmed.startsWith('last_updated:')) metadata.last_updated = trimmed.split(':').slice(1).join(':').trim().replace(/['"]/g, '');
    if (trimmed.startsWith('document_id:')) metadata.document_id = trimmed.split(':').slice(1).join(':').trim().replace(/['"]/g, '');
    // Only match top-level type: (no leading whitespace) to avoid catching nested keys like urgency.type
    if (/^type:/.test(line)) metadata.type = trimmed.split(':').slice(1).join(':').trim().replace(/['"]/g, '');
  }

  // Detect vocabulary/terminology sections
  const vocabMatch = yamlContent.match(/vocabulary:|terminology:|glossary:/);
  if (vocabMatch) {
    const vocabStart = yamlContent.indexOf(vocabMatch[0]);
    const vocabSection = yamlContent.substring(vocabStart, vocabStart + 500);
    metadata.vocabulary = vocabSection;
  }

  return metadata;
}

function inferArtifactType(filePath, metadata) {
  if (metadata.type) return metadata.type;

  const filename = path.basename(filePath, path.extname(filePath)).toLowerCase();
  const typeMap = {
    'offerbook': 'Offerbook',
    'icp': 'ICP',
    'bmc': 'BMC',
    'lean-canvas': 'Lean Canvas',
    'pricing-strategy': 'Pricing Strategy',
    'pricing': 'Pricing Strategy',
    'product-spec': 'Product Spec',
    'syllabus': 'Syllabus',
    'reverse-revenue': 'Reverse Revenue Plan',
    'team-structure': 'Team Structure',
    'diagnosis': 'Diagnosis',
    'bu-map': 'BU Map',
    'entity-architecture': 'Entity Architecture',
    'skill-taxonomy': 'Skill Taxonomy',
    'taxonomy-registry': 'Taxonomy Registry',
    'bonus-model': 'Bonus Model',
    'domain-model': 'Domain Model',
    'company-dna': 'Company DNA',
    'founder-dna': 'Founder DNA',
  };

  for (const [key, value] of Object.entries(typeMap)) {
    if (filename.includes(key)) return value;
  }

  // Title-case the filename as fallback
  return filename.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function buildDocTitle(artifactType, metadata) {
  const version = metadata.version || '1.0';
  return `${artifactType} AllFluence v${version}`;
}

// ---------------------------------------------------------------------------
// 3. Claude API transformation
// ---------------------------------------------------------------------------

async function transformWithClaude(yamlContent, metadata, artifactType, styleGuide) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();

  const vocabInstruction = metadata.vocabulary
    ? `\n\nIMPORTANT VOCABULARY CONSTRAINTS found in the artifact:\n${metadata.vocabulary}\nYou MUST use these exact terms throughout the document.`
    : '';

  const userPrompt = `Transform the following YAML artifact into a polished, human-readable Markdown document.

Artifact type: ${artifactType}
Metadata: version=${metadata.version || 'unknown'}, state=${metadata.state || 'unknown'}, owner=${metadata.owner || 'unknown'}, layer=${metadata.layer || 'unknown'}, last_updated=${metadata.last_updated || 'unknown'}
${vocabInstruction}

YAML content:
\`\`\`yaml
${yamlContent}
\`\`\`

Output ONLY the Markdown document. No explanations, no code fences around the output. Start directly with the H1 heading.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: styleGuide,
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Extract text from response
  const textBlock = message.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('Claude API returned no text content');

  return textBlock.text;
}

// ---------------------------------------------------------------------------
// 4. ClickUp publishing
// ---------------------------------------------------------------------------

async function publishToClickUp(docTitle, markdown) {
  // Dynamic require to handle monorepo path resolution
  const docsPath = path.resolve(__dirname, '../../../../services/clickup/docs.js');
  const { createDocWithContent } = require(docsPath);

  const result = await createDocWithContent({
    name: docTitle,
    content: markdown,
    visibility: 'PRIVATE',
  });

  return result;
}

async function publishAsSubpage(parentDocId, docTitle, markdown) {
  const docsPath = path.resolve(__dirname, '../../../../services/clickup/docs.js');
  const { createPage, getDocUrl } = require(docsPath);

  const page = await createPage(parentDocId, {
    name: docTitle,
    content: markdown,
    contentFormat: 'text/md',
  });

  const url = getDocUrl(parentDocId);

  return {
    page,
    url,
    id: parentDocId,
    pageId: page.id,
  };
}

// ---------------------------------------------------------------------------
// 5. Task linking (optional)
// ---------------------------------------------------------------------------

async function linkToTask(taskId, docTitle, docUrl) {
  try {
    const tasksPath = path.resolve(__dirname, '../../../../services/clickup/tasks.js');
    const { appendJournalEntry } = require(tasksPath);

    await appendJournalEntry(
      taskId,
      `Doc materializado: ${docTitle} — URL: ${docUrl}`,
      'materialize-doc',
      {
        person: 'Pedro Valerio',
        color: '\uD83D\uDFE2',
        icon: '\uD83D\uDE80',
        category: '[ENTREGA]',
      }
    );

    console.log(`[materialize-doc] Linked Doc to task ${taskId}`);
  } catch (err) {
    console.warn(`[materialize-doc] WARNING: Failed to link to task ${taskId}: ${err.message}`);
    console.warn('[materialize-doc] The Doc was published successfully — only the task linking failed.');
  }
}

// ---------------------------------------------------------------------------
// 6. Fallback: save Markdown locally
// ---------------------------------------------------------------------------

function saveFallbackMarkdown(yamlPath, markdown) {
  const docsDir = path.resolve(__dirname, '../../../../docs/materialized');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const basename = path.basename(yamlPath, path.extname(yamlPath));
  const outPath = path.join(docsDir, `${basename}.md`);
  fs.writeFileSync(outPath, markdown, 'utf-8');
  console.log(`[materialize-doc] Fallback saved to: ${outPath}`);
  return outPath;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { yamlPath, taskId, cfId, parentDocId } = parseArgs(process.argv);

  // Validate arguments
  if (!yamlPath) {
    console.error('Usage: node materialize-doc.js <yaml-path> [--task-id <clickup-task-id>] [--cf-id <custom-field-id>] [--parent-doc-id <clickup-doc-id>]');
    process.exit(1);
  }

  // Resolve path
  const resolvedPath = path.resolve(yamlPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`[materialize-doc] ERROR: File not found: ${resolvedPath}`);
    process.exit(1);
  }

  // Check environment
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[materialize-doc] ERROR: ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log(`[materialize-doc] Reading YAML: ${resolvedPath}`);
  const yamlContent = fs.readFileSync(resolvedPath, 'utf-8');

  if (!yamlContent.trim()) {
    console.error('[materialize-doc] ERROR: YAML file is empty');
    process.exit(1);
  }

  // Extract metadata
  const metadata = extractMetadata(yamlContent);
  const artifactType = inferArtifactType(resolvedPath, metadata);
  const docTitle = buildDocTitle(artifactType, metadata);

  console.log(`[materialize-doc] Artifact: ${artifactType} | Version: ${metadata.version || 'unknown'} | State: ${metadata.state || 'unknown'}`);

  // Load style guide
  const styleGuidePath = path.resolve(__dirname, '../references/style-guide.md');
  const styleGuide = fs.readFileSync(styleGuidePath, 'utf-8');

  // Transform with Claude API
  console.log('[materialize-doc] Transforming YAML to Markdown via Claude API...');
  let markdown;
  try {
    markdown = await transformWithClaude(yamlContent, metadata, artifactType, styleGuide);
  } catch (err) {
    console.warn(`[materialize-doc] First attempt failed: ${err.message}. Retrying...`);
    try {
      markdown = await transformWithClaude(yamlContent, metadata, artifactType, styleGuide);
    } catch (retryErr) {
      console.error(`[materialize-doc] ERROR: Claude API failed after retry: ${retryErr.message}`);
      process.exit(1);
    }
  }

  console.log(`[materialize-doc] Markdown generated (${markdown.length} chars)`);

  // Post-process: fix PT-BR accents
  markdown = processText(markdown);
  console.log('[materialize-doc] PT-BR accent correction applied');

  // Publish to ClickUp
  if (!process.env.CLICKUP_API_KEY || !process.env.CLICKUP_TEAM_ID) {
    console.warn('[materialize-doc] WARNING: CLICKUP_API_KEY or CLICKUP_TEAM_ID not set — saving locally as fallback');
    const fallbackPath = saveFallbackMarkdown(resolvedPath, markdown);
    console.log(`\n[materialize-doc] RESULT: Markdown saved to ${fallbackPath}`);
    console.log('[materialize-doc] Set CLICKUP_API_KEY and CLICKUP_TEAM_ID to publish to ClickUp.');
    return;
  }

  const isSubpage = !!parentDocId;
  console.log(`[materialize-doc] Publishing to ClickUp as ${isSubpage ? 'subpage of doc ' + parentDocId : 'standalone doc'}...`);
  let result;
  try {
    if (isSubpage) {
      result = await publishAsSubpage(parentDocId, docTitle, markdown);
    } else {
      result = await publishToClickUp(docTitle, markdown);
    }
  } catch (err) {
    console.warn(`[materialize-doc] ClickUp publish failed: ${err.message}`);
    console.warn('[materialize-doc] Saving Markdown locally as fallback...');
    const fallbackPath = saveFallbackMarkdown(resolvedPath, markdown);
    console.log(`\n[materialize-doc] RESULT: Markdown saved to ${fallbackPath}`);
    return;
  }

  console.log(`\n[materialize-doc] SUCCESS! (${isSubpage ? 'Subpage' : 'Standalone Doc'})`);
  console.log(`  Doc Title: ${docTitle}`);
  console.log(`  Doc URL:   ${result.url}`);
  if (isSubpage) {
    console.log(`  Parent Doc ID: ${result.id}`);
    console.log(`  Page ID:       ${result.pageId}`);
  } else {
    console.log(`  Doc ID:    ${result.id}`);
  }

  // Optional: link to task
  if (taskId) {
    await linkToTask(taskId, docTitle, result.url);
  }

  // Optional: set Custom Field URL on the task
  if (taskId && cfId) {
    try {
      const cfPath = path.resolve(__dirname, '../../../../services/clickup/custom-fields.js');
      const { setCustomFieldValue } = require(cfPath);
      await setCustomFieldValue(taskId, cfId, result.url);
      console.log(`[materialize-doc] Set CF ${cfId} on task ${taskId} to Doc URL`);
    } catch (cfErr) {
      console.warn(`[materialize-doc] WARNING: Failed to set CF URL on task ${taskId}: ${cfErr.message}`);
      console.warn('[materialize-doc] The Doc was published successfully -- only the CF update failed.');
    }
  }
}

main().catch(err => {
  console.error(`[materialize-doc] FATAL: ${err.message}`);
  process.exit(1);
});
