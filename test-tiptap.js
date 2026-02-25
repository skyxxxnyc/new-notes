import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

const editor = new Editor({
  extensions: [StarterKit, Markdown],
  content: '<h2>Overview</h2><p>Hello</p>',
});
console.log(editor.storage.markdown.getMarkdown());
