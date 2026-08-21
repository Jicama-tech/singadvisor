// An LLM's raw output and Quill's own HTML serialization can both produce
// literal "&nbsp;" entities or raw U+00A0 characters between words instead
// of normal spaces. Since &nbsp; disables line-wrapping, that turns whole
// paragraphs into one unbreakable line and blows out the page with
// horizontal scroll. Applied both to freshly AI-generated content and again
// at save time, since content re-enters the rich-text editor between those
// two points and can pick the entities back up.
export function normalizeSpaces(html: string): string {
  return html.replace(/&nbsp;/g, ' ').replace(/ /g, ' ');
}
