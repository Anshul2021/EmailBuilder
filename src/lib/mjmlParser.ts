// ─── MJML Tree Parser / Serializer ───────────────────────────────────────────
// Lightweight utilities for section-level MJML manipulation.
// Uses regex-based parsing to avoid additional XML dependencies.

export interface MjmlSection {
  index: number;
  content: string;       // Full <mj-section>...</mj-section> markup
  startOffset: number;   // Character offset in original MJML
  endOffset: number;
}

/**
 * Extract all top-level <mj-section> blocks from an MJML string.
 */
export function parseMjmlSections(mjml: string): MjmlSection[] {
  const sections: MjmlSection[] = [];
  const regex = /<mj-section[\s>]/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(mjml)) !== null) {
    const startOffset = match.index;
    const endTag = findClosingTag(mjml, startOffset, "mj-section");
    if (endTag === -1) continue;

    const content = mjml.substring(startOffset, endTag);
    sections.push({
      index: sections.length,
      content,
      startOffset,
      endOffset: endTag,
    });

    // Move regex past this section to avoid nested matches
    regex.lastIndex = endTag;
  }

  return sections;
}

/**
 * Find the matching closing tag, handling nested tags of the same name.
 */
function findClosingTag(mjml: string, startOffset: number, tagName: string): number {
  const openTag = new RegExp(`<${tagName}[\\s>]`, "gi");
  const closeTag = `</${tagName}>`;
  let depth = 0;
  let i = startOffset;

  while (i < mjml.length) {
    // Check for closing tag at current position
    if (mjml.substring(i, i + closeTag.length).toLowerCase() === closeTag.toLowerCase()) {
      if (depth === 1) {
        return i + closeTag.length;
      }
      depth--;
      i += closeTag.length;
      continue;
    }

    // Check for opening tag at current position
    openTag.lastIndex = i;
    const openMatch = openTag.exec(mjml);
    if (openMatch && openMatch.index === i) {
      depth++;
      i = openTag.lastIndex;
      continue;
    }

    i++;
  }

  return -1;
}

/**
 * Replace a single section at the given index with new MJML content.
 */
/**
 * Replace a single section at the given index with new MJML content.
 */
export function replaceMjmlSection(fullMjml: string, sectionIndex: number, newSectionMjml: string): string {
  const sections = parseMjmlSections(fullMjml);
  if (sections.length === 0) return fullMjml;

  let index = sectionIndex;
  if (index < 0) index = 0;
  if (index >= sections.length) index = sections.length - 1;

  const section = sections[index];
  return fullMjml.substring(0, section.startOffset) + newSectionMjml + fullMjml.substring(section.endOffset);
}

/**
 * Duplicate a section at the given index (insert copy after it).
 */
export function duplicateSection(fullMjml: string, sectionIndex: number): string {
  const sections = parseMjmlSections(fullMjml);
  if (sections.length === 0) return fullMjml;

  let index = sectionIndex;
  if (index < 0) index = 0;
  if (index >= sections.length) index = sections.length - 1;

  const section = sections[index];
  return fullMjml.substring(0, section.endOffset) + "\n" + section.content + fullMjml.substring(section.endOffset);
}

/**
 * Remove a section at the given index.
 */
export function removeSection(fullMjml: string, sectionIndex: number): string {
  const sections = parseMjmlSections(fullMjml);
  if (sections.length === 0) return fullMjml;

  let index = sectionIndex;
  if (index < 0) index = 0;
  if (index >= sections.length) index = sections.length - 1;

  const section = sections[index];
  // Also trim any trailing whitespace/newline
  let endOffset = section.endOffset;
  while (endOffset < fullMjml.length && (fullMjml[endOffset] === "\n" || fullMjml[endOffset] === "\r")) {
    endOffset++;
  }

  return fullMjml.substring(0, section.startOffset) + fullMjml.substring(endOffset);
}

/**
 * Move a section from one index to another.
 */
export function moveSection(fullMjml: string, fromIndex: number, toIndex: number): string {
  const sections = parseMjmlSections(fullMjml);
  if (sections.length === 0) return fullMjml;

  let fromIdx = fromIndex;
  if (fromIdx < 0) fromIdx = 0;
  if (fromIdx >= sections.length) fromIdx = sections.length - 1;

  let toIdx = toIndex;
  if (toIdx < 0) toIdx = 0;
  if (toIdx >= sections.length) toIdx = sections.length - 1;

  if (fromIdx === toIdx) return fullMjml;

  const sectionContent = sections[fromIdx].content;

  // First remove, then insert at the new position
  let result = removeSection(fullMjml, fromIdx);

  // Re-parse after removal to get correct offsets
  const updatedSections = parseMjmlSections(result);

  // Determine insertion point
  if (toIdx >= updatedSections.length) {
    // Insert after the last section
    const lastSection = updatedSections[updatedSections.length - 1];
    result = result.substring(0, lastSection.endOffset) + "\n" + sectionContent + result.substring(lastSection.endOffset);
  } else {
    const targetSection = updatedSections[toIdx];
    result = result.substring(0, targetSection.startOffset) + sectionContent + "\n" + result.substring(targetSection.startOffset);
  }

  return result;
}

/**
 * Get the number of sections in an MJML template.
 */
export function getSectionCount(mjml: string): number {
  return parseMjmlSections(mjml).length;
}

/**
 * Get just the content of a specific section.
 */
export function getSection(mjml: string, sectionIndex: number): string | null {
  const sections = parseMjmlSections(mjml);
  if (sections.length === 0) return null;

  let index = sectionIndex;
  if (index < 0) index = 0;
  if (index >= sections.length) index = sections.length - 1;

  return sections[index].content;
}
