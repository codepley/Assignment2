// Initialize Mermaid.js
mermaid.initialize({ startOnLoad: false });

// DOM element references
const generateBtn = document.getElementById('generateBtn');
const jsonInput = document.getElementById('jsonInput');
const outputContainer = document.getElementById('outputContainer');
const exportHtmlBtn = document.getElementById('exportHtmlBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');

/**
 * Main function to generate the dictionary and diagram from JSON input.
 */
generateBtn.addEventListener('click', async () => {
    let data;
    try {
        data = JSON.parse(jsonInput.value);
    } catch (error) {
        outputContainer.innerHTML = `<p style="color: red;">Error: Invalid JSON format. ${error.message}</p>`;
        return;
    }

    // Clear previous output
    outputContainer.innerHTML = '';

    // Generate and append content
    outputContainer.appendChild(createGlossary(data.tables));
    const diagramContainer = await createDiagram(data.tables, data.relationships);
    outputContainer.appendChild(diagramContainer);

    // Show export buttons
    exportHtmlBtn.style.display = 'inline-block';
    exportPdfBtn.style.display = 'inline-block';
});

/**
 * Creates HTML tables for each table schema.
 * @param {Array} tables - Array of table objects from JSON.
 * @returns {HTMLElement} A div element containing the glossary.
 */
function createGlossary(tables) {
    const glossaryDiv = document.createElement('div');
    glossaryDiv.innerHTML = '<h2>Data Glossary</h2>';

    tables.forEach(table => {
        const tableTitle = document.createElement('h3');
        tableTitle.textContent = table.name;
        glossaryDiv.appendChild(tableTitle);

        const tableEl = document.createElement('table');
        const thead = `<thead><tr><th>Column Name</th><th>Data Type</th><th>Keys</th><th>Description</th></tr></thead>`;
        let tbodyContent = '';

        table.columns.forEach(col => {
            const keys = [];
            if (col.isPrimaryKey) keys.push('PK');
            if (col.isForeignKey) keys.push('FK');
            tbodyContent += `
                <tr>
                    <td>${col.name}</td>
                    <td>${col.dataType}</td>
                    <td>${keys.join(', ')}</td>
                    <td>${col.description || ''}</td>
                </tr>`;
        });
        tableEl.innerHTML = thead + `<tbody>${tbodyContent}</tbody>`;
        glossaryDiv.appendChild(tableEl);
    });

    return glossaryDiv;
}

/**
 * Creates the Mermaid ER diagram.
 * @param {Array} tables - Array of table objects from JSON.
 * @param {Array} relationships - Array of relationship objects from JSON.
 * @returns {Promise<HTMLElement>} A div element containing the rendered SVG diagram.
 */
async function createDiagram(tables, relationships) {
    const diagramDiv = document.createElement('div');
    diagramDiv.innerHTML = '<h2>Table Relationship Diagram</h2>';
    
    let mermaidSyntax = 'erDiagram\n';

    // Define entities (tables)
    tables.forEach(table => {
        mermaidSyntax += `    ${table.name} {\n`;
        table.columns.forEach(col => {
            const pk = col.isPrimaryKey ? 'PK' : '';
            const fk = col.isForeignKey ? 'FK' : '';
            mermaidSyntax += `        ${col.dataType.replace(/\s/g, '_')} ${col.name} "${pk} ${fk}"\n`;
        });
        mermaidSyntax += '    }\n';
    });

    // Define relationships
    relationships.forEach(rel => {
        mermaidSyntax += `    ${rel.toTable} ||--o{ ${rel.fromTable} : ""\n`;
    });

    const mermaidContainer = document.createElement('div');
    mermaidContainer.classList.add('mermaid');
    
    // Render the diagram and get the SVG
    const { svg } = await mermaid.render('graphDiv', mermaidSyntax);
    mermaidContainer.innerHTML = svg;

    diagramDiv.appendChild(mermaidContainer);
    return diagramDiv;
}

/**
 * Handles exporting the generated content to a self-contained HTML file.
 */
exportHtmlBtn.addEventListener('click', () => {
    const title = "Data Dictionary";
    const content = outputContainer.innerHTML;
    const styles = document.querySelector('style').innerHTML;

    const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <style>${document.querySelector('link[href="style.css"]').sheet.cssRules[0].cssText} table, th, td {border: 1px solid black; border-collapse: collapse;} body {font-family: sans-serif;}</style>
        </head>
        <body>
            <h1>${title}</h1>
            ${content}
        </body>
        </html>`;

    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'data-dictionary.html';
    link.click();
});

/**
 * Handles exporting the generated content to a PDF file using jsPDF and html2canvas.
 */
exportPdfBtn.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const content = document.getElementById('outputContainer');

    html2canvas(content, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('data-dictionary.pdf');
    });
});