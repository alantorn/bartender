"use strict";
figma.showUI(__html__, { width: 400, height: 320, title: 'Bartender' });
figma.ui.onmessage = async (msg) => {
    if (msg.type !== 'sync-csv')
        return;
    const titles = msg.titles;
    const logs = [];
    const templates = figma.currentPage.findAll((n) => n.name === '[template]' && n.type === 'FRAME');
    if (!templates.length) {
        figma.ui.postMessage({ type: 'done', logs: ['❌ No [template] frame found on page.'] });
        return;
    }
    const template = templates[0];
    for (const title of titles) {
        const clone = template.clone();
        clone.name = `[chart] ${title}`;
        clone.x = template.x + template.width + 48;
        clone.y = template.y + (titles.indexOf(title) * (template.height + 48));
        const titleNode = clone.findOne((n) => n.name === 'title__' && n.type === 'TEXT');
        if (!titleNode) {
            logs.push(`⚠️  "[chart] ${title}" created but no title__ text node found inside [template].`);
            continue;
        }
        const fonts = titleNode.getRangeAllFontNames(0, titleNode.characters.length);
        await Promise.all(fonts.map((f) => figma.loadFontAsync(f)));
        titleNode.characters = title;
        logs.push(`✅ Created "[chart] ${title}"`);
    }
    figma.ui.postMessage({ type: 'done', logs });
};
