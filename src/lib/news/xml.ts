/**
 * A deliberately small XML reader for untrusted feed documents.
 *
 * Feeds are third-party input, so the parser refuses the XML features that
 * turn a parser into an attack surface:
 *
 * - a `<!DOCTYPE ...>` declaration is rejected outright, which removes entity
 *   declarations and therefore XXE and billion-laughs expansion;
 * - only the five predefined entities and numeric character references are
 *   resolved, and a numeric reference is capped at a single code point;
 * - parsing is iterative over an explicit stack, so nesting depth cannot
 *   overflow the call stack;
 * - depth and node count are bounded.
 */

export type XmlNode = {
  /** Local name, lower-cased and stripped of its namespace prefix. */
  name: string;
  /** Original qualified name, lower-cased (for example `dc:creator`). */
  qualifiedName: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  text: string;
};

export class XmlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XmlParseError";
  }
}

const maxDepth = 64;
const maxNodes = 20_000;

const predefinedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
};

export function decodeXmlText(value: string) {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, entity: string) => {
    if (entity.startsWith("#")) {
      const isHex = entity[1] === "x" || entity[1] === "X";
      const digits = isHex ? entity.slice(2) : entity.slice(1);
      const codePoint = Number.parseInt(digits, isHex ? 16 : 10);

      if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) {
        return "";
      }

      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return "";
      }
    }

    const replacement = predefinedEntities[entity.toLowerCase()];

    // An unknown entity is never expanded. Feeds in the wild carry HTML
    // entities such as &nbsp; in titles, so the safe result is to drop the
    // reference rather than resolve anything the document declared.
    return replacement ?? "";
  });
}

function localName(qualifiedName: string) {
  const separator = qualifiedName.indexOf(":");
  return separator === -1 ? qualifiedName : qualifiedName.slice(separator + 1);
}

function parseAttributes(source: string) {
  const attributes: Record<string, string> = {};
  const pattern = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match = pattern.exec(source);

  while (match) {
    const name = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? "";
    attributes[name] = decodeXmlText(value);
    attributes[localName(name)] = attributes[localName(name)] ?? attributes[name];
    match = pattern.exec(source);
  }

  return attributes;
}

function createNode(qualifiedName: string, attributes: Record<string, string>): XmlNode {
  return {
    attributes,
    children: [],
    name: localName(qualifiedName),
    qualifiedName,
    text: "",
  };
}

/**
 * Parses an XML document into a node tree. Throws {@link XmlParseError} for
 * input that is not usable as a feed.
 */
export function parseXml(source: string): XmlNode {
  if (typeof source !== "string" || source.trim().length === 0) {
    throw new XmlParseError("The feed response was empty.");
  }

  if (/<!DOCTYPE/i.test(source)) {
    throw new XmlParseError(
      "The feed declares a DOCTYPE. Document type declarations are rejected because they can carry external entities.",
    );
  }

  const root = createNode("#document", {});
  const stack: XmlNode[] = [root];
  let nodeCount = 0;
  let index = 0;

  while (index < source.length) {
    const openIndex = source.indexOf("<", index);

    if (openIndex === -1) {
      stack[stack.length - 1].text += decodeXmlText(source.slice(index));
      break;
    }

    if (openIndex > index) {
      stack[stack.length - 1].text += decodeXmlText(source.slice(index, openIndex));
    }

    if (source.startsWith("<!--", openIndex)) {
      const end = source.indexOf("-->", openIndex + 4);
      index = end === -1 ? source.length : end + 3;
      continue;
    }

    if (source.startsWith("<![CDATA[", openIndex)) {
      const end = source.indexOf("]]>", openIndex + 9);
      const raw = source.slice(openIndex + 9, end === -1 ? source.length : end);
      // CDATA is literal by definition: no entity resolution.
      stack[stack.length - 1].text += raw;
      index = end === -1 ? source.length : end + 3;
      continue;
    }

    if (source.startsWith("<?", openIndex)) {
      const end = source.indexOf("?>", openIndex + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }

    const closeIndex = source.indexOf(">", openIndex);

    if (closeIndex === -1) {
      throw new XmlParseError("The feed contains an unterminated tag.");
    }

    const rawTag = source.slice(openIndex + 1, closeIndex).trim();
    index = closeIndex + 1;

    if (rawTag.startsWith("/")) {
      const closingName = rawTag.slice(1).trim().toLowerCase();

      // Tolerate mismatched closing tags by unwinding to the nearest match
      // rather than failing the whole feed.
      for (let depth = stack.length - 1; depth > 0; depth -= 1) {
        if (stack[depth].qualifiedName === closingName) {
          stack.length = depth;
          break;
        }
      }

      continue;
    }

    const selfClosing = rawTag.endsWith("/");
    const body = selfClosing ? rawTag.slice(0, -1).trim() : rawTag;
    const nameEnd = body.search(/[\s/]/);
    const qualifiedName = (nameEnd === -1 ? body : body.slice(0, nameEnd)).toLowerCase();

    if (!qualifiedName) {
      continue;
    }

    nodeCount += 1;

    if (nodeCount > maxNodes) {
      throw new XmlParseError("The feed contains too many elements to process safely.");
    }

    const attributes = nameEnd === -1 ? {} : parseAttributes(body.slice(nameEnd));
    const node = createNode(qualifiedName, attributes);
    stack[stack.length - 1].children.push(node);

    if (!selfClosing) {
      if (stack.length >= maxDepth) {
        throw new XmlParseError("The feed is nested too deeply to process safely.");
      }

      stack.push(node);
    }
  }

  return root;
}

/** First direct child matching any of the given local or qualified names. */
export function findChild(node: XmlNode, ...names: string[]) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));

  return (
    node.children.find(
      (child) => wanted.has(child.name) || wanted.has(child.qualifiedName),
    ) ?? null
  );
}

/** All direct children matching any of the given local or qualified names. */
export function findChildren(node: XmlNode, ...names: string[]) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));

  return node.children.filter(
    (child) => wanted.has(child.name) || wanted.has(child.qualifiedName),
  );
}

/** Trimmed text of the first matching child, or an empty string. */
export function childText(node: XmlNode, ...names: string[]) {
  return findChild(node, ...names)?.text.trim() ?? "";
}

/** Depth-first search for the first descendant with the given local name. */
export function findDescendant(node: XmlNode, name: string): XmlNode | null {
  const wanted = name.toLowerCase();
  const queue = [...node.children];

  while (queue.length > 0) {
    const current = queue.shift() as XmlNode;

    if (current.name === wanted || current.qualifiedName === wanted) {
      return current;
    }

    queue.push(...current.children);
  }

  return null;
}
