/** remark-math only knows $ delimiters; models also write \( \) and \[ \], so convert those. */
export const normalizeMath = (text: string): string =>
  text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m}$`)
