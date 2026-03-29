import { apiFetch } from '../lib/api';

export const saveNotionToken = async (token: string) => {
  const data = await apiFetch('/api/auth/notion/token', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  return data;
};

export const getNotionToken = async () => {
  const data = await apiFetch('/api/auth/notion/token');
  return data.token;
};

export const searchNotion = async (query: string = '') => {
  const data = await apiFetch('/api/auth/notion/proxy/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      // No filter to get both pages and databases
    }),
  });
  return data.results;
};

export const listNotionDatabases = async () => {
  const data = await apiFetch('/api/auth/notion/proxy/search', {
    method: 'POST',
    body: JSON.stringify({
      filter: { property: 'object', value: 'database' },
    }),
  });
  return data.results;
};

const formatRichText = (richText: any[]): string => {
  return richText.map((t: any) => {
    let text = t.plain_text;
    if (t.annotations.bold) text = `**${text}**`;
    if (t.annotations.italic) text = `*${text}*`;
    if (t.annotations.strikethrough) text = `~~${text}~~`;
    if (t.annotations.code) text = `\`${text}\``;
    if (t.href) text = `[${text}](${t.href})`;
    return text;
  }).join('');
};

const getPageContent = async (blockId: string, depth: number = 0): Promise<string> => {
  if (depth > 5) return ''; // Prevent infinite recursion
  try {
    const data = await apiFetch(`/api/auth/notion/proxy/blocks/${blockId}/children`);
    const blockPromises = data.results.map(async (block: any) => {
      let content = '';
      let childrenContent = '';

      if (block.has_children) {
        childrenContent = await getPageContent(block.id, depth + 1);
      }

      switch (block.type) {
        case 'paragraph':
          content = formatRichText(block.paragraph.rich_text);
          break;
        case 'heading_1':
          content = '# ' + formatRichText(block.heading_1.rich_text);
          break;
        case 'heading_2':
          content = '## ' + formatRichText(block.heading_2.rich_text);
          break;
        case 'heading_3':
          content = '### ' + formatRichText(block.heading_3.rich_text);
          break;
        case 'bulleted_list_item':
          content = '- ' + formatRichText(block.bulleted_list_item.rich_text);
          break;
        case 'numbered_list_item':
          content = '1. ' + formatRichText(block.numbered_list_item.rich_text);
          break;
        case 'to_do':
          content = `[${block.to_do.checked ? 'x' : ' '}] ` + formatRichText(block.to_do.rich_text);
          break;
        case 'quote':
          content = '> ' + formatRichText(block.quote.rich_text);
          break;
        case 'code':
          content = '```' + (block.code.language || '') + '\n' + formatRichText(block.code.rich_text) + '\n```';
          break;
        case 'divider':
          content = '---';
          break;
        case 'callout':
          content = '> ' + (block.callout.icon?.emoji || '💡') + ' ' + formatRichText(block.callout.rich_text);
          break;
        case 'toggle':
          content = '<details><summary>' + formatRichText(block.toggle.rich_text) + '</summary>\n' + childrenContent + '\n</details>';
          childrenContent = ''; // Already handled
          break;
        case 'image':
          const url = block.image.type === 'external' ? block.image.external.url : block.image.file.url;
          content = `![Image](${url})`;
          break;
        case 'video':
          const videoUrl = block.video.type === 'external' ? block.video.external.url : block.video.file.url;
          content = `[Video](${videoUrl})`;
          break;
        case 'file':
          const fileUrl = block.file.type === 'external' ? block.file.external.url : block.file.file.url;
          content = `[File](${fileUrl})`;
          break;
        case 'child_page':
          content = `[[${block.child_page.title}]]`;
          break;
        case 'child_database':
          content = `<div data-type="database" data-id="${block.id}"></div>`;
          break;
        default:
          content = '';
      }

      if (childrenContent && block.type !== 'toggle') {
        content += '\n' + childrenContent.split('\n').map(line => '  ' + line).join('\n');
      }

      return content;
    });

    const results = await Promise.all(blockPromises);
    return results.filter(c => c !== '').join('\n\n');
  } catch (error) {
    console.error('Failed to get page content:', error);
    return '';
  }
};

export const importNotionPage = async (pageId: string) => {
  console.log('Starting import for page:', pageId);
  const pageData = await apiFetch(`/api/auth/notion/proxy/pages/${pageId}`);
  const content = await getPageContent(pageId);
  
  const title = pageData.properties.title?.title[0]?.plain_text || 
                pageData.properties.Name?.title[0]?.plain_text || 
                "Untitled Page";

  await apiFetch('/api/pages', {
    method: 'POST',
    body: JSON.stringify({
      title,
      content,
      properties: JSON.stringify(pageData.properties),
      databaseId: null, // Standalone page
      parentId: null,
      isTemplate: false
    })
  });
  console.log('Page import completed');
};

export const importNotionDatabase = async (databaseId: string) => {
  console.log('Starting import for database:', databaseId);
  
  // Call our backend proxy instead of direct Notion API
  const [dbResponse, pagesResponse] = await Promise.all([
    apiFetch(`/api/auth/notion/proxy/databases/${databaseId}`),
    apiFetch(`/api/auth/notion/proxy/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  ]);
  
  console.log('Notion data fetched via proxy');

  // Send to our backend to import into Supabase
  const pagesWithContent = await Promise.all(pagesResponse.results.map(async (page: any) => {
    const content = await getPageContent(page.id);
    return {
      id: page.id,
      title: page.properties.Name?.title[0]?.plain_text || 
             page.properties.title?.title[0]?.plain_text || 
             "Untitled",
      content,
      properties: JSON.stringify(page.properties),
    };
  }));

  await apiFetch('/api/databases/import', {
    method: 'POST',
    body: JSON.stringify({
      database: {
        name: dbResponse.title[0].plain_text,
        columns: JSON.stringify(Object.keys(dbResponse.properties).map(key => ({ id: key, name: key, type: dbResponse.properties[key].type }))),
      },
      pages: pagesWithContent
    })
  });
  console.log('Import completed');
};
