// ─── MJML Tree Engine ────────────────────────────────────────────────────────
// Parses MJML into a typed tree, serializes back, auto-names nodes, and
// provides mutation operations (move, duplicate, delete, hide, rename).

// ── Types ────────────────────────────────────────────────────────────────────

export type MjmlNodeType =
  | "mjml" | "head" | "body" | "section" | "column" | "group" | "wrapper"
  | "text" | "image" | "button" | "divider" | "spacer" | "social" | "social-element"
  | "table" | "raw" | "attributes" | "style" | "font" | "preview" | "title" | "all"
  | "unknown";

export interface MjmlNode {
  id: string;
  type: MjmlNodeType;
  name: string;
  children: MjmlNode[];
  attributes: Record<string, string>;
  content?: string;       // Inner text content (for mj-text, mj-button, etc.)
  isHidden: boolean;
  isExpanded: boolean;
  rawTag: string;         // Original tag name e.g. "mj-section"
}

// ── ID Generation ────────────────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `node-${++idCounter}-${Date.now().toString(36)}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

// ── Tag → Type mapping ──────────────────────────────────────────────────────

function tagToType(tag: string): MjmlNodeType {
  const map: Record<string, MjmlNodeType> = {
    "mjml": "mjml",
    "mj-head": "head",
    "mj-body": "body",
    "mj-section": "section",
    "mj-column": "column",
    "mj-group": "group",
    "mj-wrapper": "wrapper",
    "mj-text": "text",
    "mj-image": "image",
    "mj-button": "button",
    "mj-divider": "divider",
    "mj-spacer": "spacer",
    "mj-social": "social",
    "mj-social-element": "social-element",
    "mj-table": "table",
    "mj-raw": "raw",
    "mj-attributes": "attributes",
    "mj-style": "style",
    "mj-font": "font",
    "mj-preview": "preview",
    "mj-title": "title",
    "mj-all": "all",
  };
  return map[tag.toLowerCase()] || "unknown";
}

// ── Type icons for the layer panel ──────────────────────────────────────────

export function getNodeIcon(type: MjmlNodeType): string {
  const icons: Record<string, string> = {
    mjml: "📧",
    head: "⚙️",
    body: "📄",
    section: "📦",
    column: "📐",
    group: "📐",
    wrapper: "📦",
    text: "📝",
    image: "🖼️",
    button: "🔘",
    divider: "➖",
    spacer: "↕️",
    social: "🔗",
    "social-element": "🔗",
    table: "📊",
    raw: "🔧",
    attributes: "⚙️",
    style: "🎨",
    font: "🔤",
    preview: "👁️",
    title: "📌",
    all: "⚙️",
    unknown: "❓",
  };
  return icons[type] || "❓";
}

// ── Auto-Naming ─────────────────────────────────────────────────────────────

function autoNameNode(node: MjmlNode, sectionIndex?: number): string {
  switch (node.type) {
    case "mjml": return "Template";
    case "head": return "Head";
    case "body": return "Body";
    case "section": {
      // Try to infer name from content
      const bgColor = node.attributes["background-color"];
      const textContent = extractTextContent(node).toLowerCase();

      if (textContent.includes("unsubscribe") || textContent.includes("©") || textContent.includes("copyright"))
        return "Footer";
      if (textContent.includes("welcome") || textContent.includes("hero"))
        return "Hero Section";
      if (textContent.includes("feature") || textContent.includes("why choose"))
        return "Feature Grid";
      if (textContent.includes("get started") || textContent.includes("sign up") || textContent.includes("try") || textContent.includes("start"))
        return "CTA Section";
      if (textContent.includes("testimonial") || textContent.includes("review") || textContent.includes("said"))
        return "Testimonial";
      if (textContent.includes("pricing") || textContent.includes("plan"))
        return "Pricing Section";

      // Check if it looks like a header (has image, short text)
      const hasImage = node.children.some(c => c.type === "column" && c.children.some(b => b.type === "image"));
      const textNodes = findAllOfType(node, "text");
      if (hasImage && textNodes.length <= 1 && sectionIndex === 0)
        return "Header";
      if (hasImage && textNodes.length >= 2)
        return "Hero Section";

      // Check if it's a multi-column layout
      const columns = node.children.filter(c => c.type === "column");
      if (columns.length >= 3)
        return "Feature Grid";
      if (columns.length === 2)
        return "Two Column Section";

      // Dark background sections are often CTAs
      if (bgColor && isDarkColor(bgColor))
        return "CTA Section";

      if (sectionIndex !== undefined)
        return `Section ${sectionIndex + 1}`;
      return "Section";
    }
    case "column": {
      const width = node.attributes["width"];
      if (width) return `Column (${width})`;
      return "Column";
    }
    case "text": {
      const text = stripHtml(node.content || "").trim();
      if (text.length === 0) return "Empty Text";
      return text.length > 30 ? text.substring(0, 30) + "…" : text;
    }
    case "image": {
      const alt = node.attributes["alt"];
      if (alt) return alt.length > 30 ? alt.substring(0, 30) + "…" : alt;
      return "Image";
    }
    case "button": {
      const btnText = stripHtml(node.content || "").trim();
      return btnText || "Button";
    }
    case "divider": return "Divider";
    case "spacer": return "Spacer";
    case "social": return "Social Links";
    case "social-element": {
      const name = node.attributes["name"];
      return name ? name.charAt(0).toUpperCase() + name.slice(1) : "Social Link";
    }
    case "attributes": return "Attributes";
    case "style": return "Styles";
    case "font": return node.attributes["name"] || "Font";
    case "preview": return "Preview Text";
    case "title": return "Title";
    default: return node.rawTag;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
}

function extractTextContent(node: MjmlNode): string {
  let text = node.content ? stripHtml(node.content) : "";
  for (const child of node.children) {
    text += " " + extractTextContent(child);
  }
  return text.trim();
}

function findAllOfType(node: MjmlNode, type: MjmlNodeType): MjmlNode[] {
  const results: MjmlNode[] = [];
  if (node.type === type) results.push(node);
  for (const child of node.children) {
    results.push(...findAllOfType(child, type));
  }
  return results;
}

function isDarkColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

// ── MJML Parser (string → tree) ─────────────────────────────────────────────

interface ParseResult {
  node: MjmlNode;
  endIndex: number;
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([a-zA-Z\-:]+)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

// Self-closing MJML tags
const SELF_CLOSING_TAGS = new Set([
  "mj-image", "mj-divider", "mj-spacer", "mj-font", "mj-preview",
  "mj-title", "mj-social-element", "mj-all",
]);

function parseNode(mjml: string, startIndex: number, sectionCounter: { value: number }): ParseResult | null {
  // Skip whitespace and comments
  let i = startIndex;
  while (i < mjml.length) {
    // Skip whitespace
    while (i < mjml.length && /\s/.test(mjml[i])) i++;
    // Skip HTML comments
    if (mjml.substring(i, i + 4) === "<!--") {
      const end = mjml.indexOf("-->", i + 4);
      if (end === -1) return null;
      i = end + 3;
      continue;
    }
    break;
  }

  if (i >= mjml.length || mjml[i] !== "<") return null;

  // Find tag name
  i++; // skip <

  // Check for closing tag
  if (mjml[i] === "/") return null;

  // Read tag name
  let tagName = "";
  while (i < mjml.length && /[a-zA-Z\-]/.test(mjml[i])) {
    tagName += mjml[i];
    i++;
  }

  if (!tagName.startsWith("mj")) return null;

  // Read attributes until > or />
  const attrStart = i;
  let isSelfClosing = false;

  while (i < mjml.length) {
    if (mjml[i] === "/" && mjml[i + 1] === ">") {
      isSelfClosing = true;
      i += 2;
      break;
    }
    if (mjml[i] === ">") {
      i++;
      break;
    }
    i++;
  }

  const attrString = mjml.substring(attrStart, isSelfClosing ? i - 2 : i - 1);
  const attributes = parseAttributes(attrString);
  const type = tagToType(tagName);

  // For self-closing tags or known self-closing MJML tags
  if (isSelfClosing || SELF_CLOSING_TAGS.has(tagName.toLowerCase())) {
    const sectionIdx = type === "section" ? sectionCounter.value++ : undefined;
    const node: MjmlNode = {
      id: generateId(),
      type,
      name: "",
      children: [],
      attributes,
      isHidden: false,
      isExpanded: type === "body" || type === "mjml",
      rawTag: tagName,
    };
    node.name = autoNameNode(node, sectionIdx);
    return { node, endIndex: i };
  }

  // Find children and content
  const closingTag = `</${tagName}>`;
  const children: MjmlNode[] = [];
  const contentParts: string[] = [];
  const sectionIdx = type === "section" ? sectionCounter.value++ : undefined;

  while (i < mjml.length) {
    // Check for closing tag
    const closingIndex = mjml.indexOf(closingTag, i);
    if (closingIndex === -1) break;

    // Check if there's a child MJML tag before the closing tag
    const nextMjTag = findNextMjTag(mjml, i, closingIndex);

    if (nextMjTag === -1) {
      // No more child tags — rest is content
      contentParts.push(mjml.substring(i, closingIndex).trim());
      i = closingIndex + closingTag.length;
      break;
    }

    // Capture text content before the child tag
    const textBefore = mjml.substring(i, nextMjTag).trim();
    if (textBefore) contentParts.push(textBefore);

    // Parse child
    const childResult = parseNode(mjml, nextMjTag, sectionCounter);
    if (childResult) {
      children.push(childResult.node);
      i = childResult.endIndex;
    } else {
      // Skip past this tag somehow — find next > and continue
      const nextClose = mjml.indexOf(">", nextMjTag);
      i = nextClose === -1 ? mjml.length : nextClose + 1;
    }
  }

  const content = contentParts.join("").trim() || undefined;

  const node: MjmlNode = {
    id: generateId(),
    type,
    name: "",
    children,
    attributes,
    content,
    isHidden: false,
    isExpanded: type === "body" || type === "mjml" || type === "section",
    rawTag: tagName,
  };
  node.name = autoNameNode(node, sectionIdx);

  return { node, endIndex: i };
}

function findNextMjTag(mjml: string, start: number, end: number): number {
  let i = start;
  while (i < end) {
    // Skip comments
    if (mjml.substring(i, i + 4) === "<!--") {
      const commentEnd = mjml.indexOf("-->", i + 4);
      if (commentEnd === -1) return -1;
      i = commentEnd + 3;
      continue;
    }
    if (mjml[i] === "<" && mjml[i + 1] !== "/" && mjml.substring(i + 1, i + 3) === "mj") {
      return i;
    }
    i++;
  }
  return -1;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse raw MJML string into a MjmlNode tree.
 */
export function parseMjmlToTree(mjml: string): MjmlNode | null {
  resetIdCounter();
  const sectionCounter = { value: 0 };
  const result = parseNode(mjml.trim(), 0, sectionCounter);
  return result?.node || null;
}

/**
 * Serialize a MjmlNode tree back to MJML string.
 * Respects isHidden — hidden nodes are excluded from output.
 */
export function treeToMjml(node: MjmlNode, indent: number = 0): string {
  if (node.isHidden) return "";

  const pad = "  ".repeat(indent);
  const tag = node.rawTag;
  const attrs = serializeAttributes(node.attributes);
  const attrStr = attrs ? ` ${attrs}` : "";

  // Self-closing tags
  if (SELF_CLOSING_TAGS.has(tag.toLowerCase()) && !node.content && node.children.length === 0) {
    return `${pad}<${tag}${attrStr} />\n`;
  }

  // Tags with children
  const visibleChildren = node.children.filter(c => !c.isHidden);
  if (visibleChildren.length > 0) {
    let result = `${pad}<${tag}${attrStr}>\n`;
    if (node.content) {
      result += `${pad}  ${node.content}\n`;
    }
    for (const child of visibleChildren) {
      result += treeToMjml(child, indent + 1);
    }
    result += `${pad}</${tag}>\n`;
    return result;
  }

  // Leaf with content
  if (node.content) {
    // Keep content indentation for readability
    return `${pad}<${tag}${attrStr}>\n${pad}  ${node.content}\n${pad}</${tag}>\n`;
  }

  // Empty tag
  return `${pad}<${tag}${attrStr}></${tag}>\n`;
}

function serializeAttributes(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");
}

// ── Tree Operations ─────────────────────────────────────────────────────────

/**
 * Find a node by ID in the tree.
 */
export function findNodeById(root: MjmlNode, id: string): MjmlNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Find the parent of a node by child ID.
 */
export function findParent(root: MjmlNode, childId: string): MjmlNode | null {
  for (const child of root.children) {
    if (child.id === childId) return root;
    const found = findParent(child, childId);
    if (found) return found;
  }
  return null;
}

/**
 * Deep clone a node tree with new IDs.
 */
export function cloneNode(node: MjmlNode): MjmlNode {
  return {
    ...node,
    id: generateId(),
    children: node.children.map(c => cloneNode(c)),
  };
}

/**
 * Toggle hidden state of a node.
 */
export function toggleHidden(root: MjmlNode, nodeId: string): MjmlNode {
  const clone = deepClone(root);
  const node = findNodeById(clone, nodeId);
  if (node) node.isHidden = !node.isHidden;
  return clone;
}

/**
 * Toggle expanded state of a node.
 */
export function toggleExpanded(root: MjmlNode, nodeId: string): MjmlNode {
  const clone = deepClone(root);
  const node = findNodeById(clone, nodeId);
  if (node) node.isExpanded = !node.isExpanded;
  return clone;
}

/**
 * Delete a node by ID.
 */
export function deleteNode(root: MjmlNode, nodeId: string): MjmlNode {
  const clone = deepClone(root);
  const parent = findParent(clone, nodeId);
  if (parent) {
    parent.children = parent.children.filter(c => c.id !== nodeId);
  }
  return clone;
}

/**
 * Duplicate a node (insert copy after it in parent's children).
 */
export function duplicateNode(root: MjmlNode, nodeId: string): MjmlNode {
  const clone = deepClone(root);
  const parent = findParent(clone, nodeId);
  if (parent) {
    const idx = parent.children.findIndex(c => c.id === nodeId);
    if (idx !== -1) {
      const original = parent.children[idx];
      const copy = cloneNode(original);
      copy.name = original.name + " (copy)";
      parent.children.splice(idx + 1, 0, copy);
    }
  }
  return clone;
}

/**
 * Rename a node.
 */
export function renameNode(root: MjmlNode, nodeId: string, newName: string): MjmlNode {
  const clone = deepClone(root);
  const node = findNodeById(clone, nodeId);
  if (node) node.name = newName;
  return clone;
}

/**
 * Move a node to a new position.
 * targetId: the node to place next to
 * position: 'before' | 'after' | 'inside' (as last child)
 */
export function moveNode(
  root: MjmlNode,
  nodeId: string,
  targetId: string,
  position: "before" | "after" | "inside"
): MjmlNode {
  if (nodeId === targetId) return root;

  const clone = deepClone(root);

  // Remove from current parent
  const sourceParent = findParent(clone, nodeId);
  if (!sourceParent) return clone;
  const sourceIdx = sourceParent.children.findIndex(c => c.id === nodeId);
  if (sourceIdx === -1) return clone;
  const [movedNode] = sourceParent.children.splice(sourceIdx, 1);

  if (position === "inside") {
    const targetNode = findNodeById(clone, targetId);
    if (targetNode) {
      targetNode.children.push(movedNode);
      targetNode.isExpanded = true;
    }
  } else {
    const targetParent = findParent(clone, targetId);
    if (targetParent) {
      const targetIdx = targetParent.children.findIndex(c => c.id === targetId);
      if (targetIdx !== -1) {
        const insertIdx = position === "before" ? targetIdx : targetIdx + 1;
        targetParent.children.splice(insertIdx, 0, movedNode);
      }
    }
  }

  return clone;
}

/**
 * Get the section index of a node (for mapping to compiled HTML).
 */
export function getSectionIndex(root: MjmlNode, nodeId: string): number {
  const sections = getVisibleSections(root);
  return sections.findIndex(s => s.id === nodeId || containsNode(s, nodeId));
}

function containsNode(root: MjmlNode, nodeId: string): boolean {
  if (root.id === nodeId) return true;
  return root.children.some(c => containsNode(c, nodeId));
}

function findBody(root: MjmlNode): MjmlNode | null {
  if (root.type === "body") return root;
  for (const child of root.children) {
    const found = findBody(child);
    if (found) return found;
  }
  return null;
}

/**
 * Get all visible sections from the body.
 */
export function getVisibleSections(root: MjmlNode): MjmlNode[] {
  const body = findBody(root);
  if (!body) return [];
  
  const sections: MjmlNode[] = [];
  const traverse = (node: MjmlNode) => {
    if (node.isHidden) return;
    if (node.type === "section") {
      sections.push(node);
      return;
    }
    for (const child of node.children) {
      traverse(child);
    }
  };

  for (const child of body.children) {
    traverse(child);
  }

  return sections;
}

// ── Deep clone ──────────────────────────────────────────────────────────────

function deepClone(node: MjmlNode): MjmlNode {
  return {
    ...node,
    attributes: { ...node.attributes },
    children: node.children.map(c => deepClone(c)),
  };
}

/**
 * Get flat list of all visible layers for the panel (body's children only).
 * Used to map between tree and compiled HTML sections.
 */
export function getBodyNode(root: MjmlNode): MjmlNode | null {
  return findBody(root);
}
