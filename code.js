"use strict";
figma.showUI(__html__, { width: 400, height: 380, title: 'Bartender' });
figma.ui.onmessage = async (msg) => {
    var _a, _b;
    if (msg.type !== 'sync-csv')
        return;
    const logs = [];
    const send = (log) => {
        logs.push(log);
        figma.ui.postMessage({ type: 'log', message: log });
    };
    try {
        const blocks = msg.blocks;
        if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
            throw new Error('No blocks received from UI. Make sure the CSV was parsed correctly.');
        }
        send(`Received ${blocks.length} block(s): ${blocks.map(b => b.title).join(', ')}`);
        const templates = figma.currentPage.findAll((n) => n.name === '[template]' && n.type === 'FRAME');
        if (!templates.length) {
            throw new Error('No [template] frame found on the current page.');
        }
        const template = templates[0];
        send(`Found template: "${template.name}" (${template.width}×${template.height})`);
        // Snapshot bar__N widths from template (these are the 100% reference widths)
        const templateBarWidths = [];
        for (let k = 1;; k++) {
            const bar = template.findOne((n) => n.name === `bar__${k}` && n.type === 'FRAME');
            if (!bar)
                break;
            templateBarWidths.push(bar.width);
        }
        send(`Template has ${templateBarWidths.length} bar slot(s), widths: ${templateBarWidths.join(', ')}px`);
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            send(`Processing block ${i + 1}: "${block.title}"`);
            // Determine scaling mode: percentage (0–100 absolute) or relative (max = 100%)
            const maxValue = block.values.length ? Math.max(...block.values) : 0;
            const isPercentage = maxValue <= 100 && block.values.every(v => v >= 0);
            const scaleDivisor = isPercentage ? 100 : maxValue;
            send(`Scale mode: ${isPercentage ? 'percentage (÷100)' : `relative (÷${maxValue.toFixed(1)})`}`);
            const clone = template.clone();
            clone.name = `[chart] ${block.title}`;
            clone.x = template.x + template.width + 48;
            clone.y = template.y + (i * (template.height + 48));
            // title__
            const titleNode = clone.findOne((n) => n.name === 'title__' && n.type === 'TEXT');
            if (titleNode) {
                const fonts = titleNode.getRangeAllFontNames(0, titleNode.characters.length);
                await Promise.all(fonts.map((f) => figma.loadFontAsync(f)));
                titleNode.characters = block.title;
                send(`  ✅ title__ = "${block.title}"`);
            }
            else {
                send(`  ⚠️  No title__ node found`);
            }
            // label__1..N  (bar names from X Axis)
            for (let j = 0; j < block.labels.length; j++) {
                const labelNode = clone.findOne((n) => n.name === `label__${j + 1}` && n.type === 'TEXT');
                if (labelNode) {
                    const fonts = labelNode.getRangeAllFontNames(0, labelNode.characters.length);
                    await Promise.all(fonts.map((f) => figma.loadFontAsync(f)));
                    labelNode.characters = block.labels[j];
                }
            }
            send(`  ✅ labels set: ${block.labels.join(', ')}`);
            // value__1..N  (Y Axis values, same order as labels)
            for (let j = 0; j < block.values.length; j++) {
                const valueNode = clone.findOne((n) => n.name === `value__${j + 1}` && n.type === 'TEXT');
                if (valueNode) {
                    const fonts = valueNode.getRangeAllFontNames(0, valueNode.characters.length);
                    await Promise.all(fonts.map((f) => figma.loadFontAsync(f)));
                    valueNode.characters = block.values[j].toFixed(1);
                }
            }
            send(`  ✅ values set: ${block.values.join(', ')}`);
            // bar__1..N  — scale width proportionally
            for (let j = 0; j < block.values.length; j++) {
                const barNode = clone.findOne((n) => n.name === `bar__${j + 1}` && n.type === 'FRAME');
                if (barNode) {
                    const refWidth = (_a = templateBarWidths[j]) !== null && _a !== void 0 ? _a : barNode.width;
                    const scaled = Math.max(1, refWidth * (block.values[j] / scaleDivisor));
                    barNode.resize(scaled, barNode.height);
                }
            }
            send(`  ✅ bar widths scaled`);
        }
        send(`✅ Done — ${blocks.length} chart(s) created.`);
    }
    catch (err) {
        send(`❌ Error: ${(_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : String(err)}`);
    }
    figma.ui.postMessage({ type: 'done', logs });
};
