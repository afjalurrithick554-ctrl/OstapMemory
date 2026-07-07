import MarkdownIt from 'markdown-it'

// html: false — сырой HTML из markdown не пропускаем (защита от XSS в заметках).
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

export function renderMarkdown(src: string | null | undefined): string {
  if (!src) return ''
  return md.render(src)
}
