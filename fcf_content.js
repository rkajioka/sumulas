/**
 * Content script for FCF (Federação Cearense de Futebol) HTML match reports.
 * Injected automatically on egol.fcf.com.br/SISGOL/*
 */

function processFCFMatchReport() {
  const rows = document.querySelectorAll('tr');

  rows.forEach(row => {
    // Check if any cell in the row indicates 2nd half
    const isSecondHalf = Array.from(row.cells || []).some(cell => 
      /2[º°O0]?\s*(TEMPO|T)\b/i.test(cell.textContent.trim().toUpperCase())
    );
    
    if (isSecondHalf) {
      walkTextNodes(row, (node) => {
        const originalText = node.nodeValue;
        // Matches times like 15' or 05'
        const regex = /\b(\d{1,2})'/g;
        
        if (regex.test(originalText)) {
          const newText = originalText.replace(regex, (match, minutesStr) => {
            const minutes = parseInt(minutesStr, 10);
            return `${minutes + 45}'`;
          });
          
          if (newText !== originalText) {
            node.nodeValue = newText;
            highlightNode(node);
          }
        }
      });
    } else {
      // Check if the row is for half-time ("INTERVALO", "INT")
      const isInterval = Array.from(row.cells || []).some(cell => 
        /INTERVALO|INT/i.test(cell.textContent.trim().toUpperCase())
      );
      if (isInterval) {
        walkTextNodes(row, (node) => {
          const originalText = node.nodeValue;
          let newText = originalText;
          
          const trimmed = originalText.trim().toUpperCase();
          // Only replace if the entire text node is exactly '-' or 'INT'
          if (trimmed === '-' || trimmed === 'INT') {
            // Replaces the core word but preserves surrounding spaces if any
            newText = originalText.replace(new RegExp(trimmed.replace('-', '\\-'), 'i'), "46'");
          }
          
          if (newText !== originalText) {
          node.nodeValue = newText;
          highlightNode(node);
        }
      });
      }
    }
  });
}

function walkTextNodes(rootNode, callback) {
  const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null, false);
  const nodesToProcess = [];
  let currentNode;
  while ((currentNode = walker.nextNode())) {
    // Skip empty text nodes or scripts/styles
    if (currentNode.nodeValue.trim() !== '' && 
        currentNode.parentNode.nodeName !== 'SCRIPT' && 
        currentNode.parentNode.nodeName !== 'STYLE') {
      nodesToProcess.push(currentNode);
    }
  }
  
  nodesToProcess.forEach(callback);
}

function highlightNode(textNode) {
  try {
    const span = document.createElement('span');
    span.style.backgroundColor = '#eff2ff';
    span.style.color = '#354bed';
    span.style.fontWeight = '700';
    span.style.padding = '0 6px';
    span.style.borderRadius = '6px';
    span.style.border = '1px solid rgba(53, 75, 237, 0.3)';
    span.style.boxShadow = '0 2px 6px rgba(53, 75, 237, 0.15)';
    span.title = 'Convertido pelo Match Report Converter';
    
    // Wrap the text node with the span
    const parent = textNode.parentNode;
    parent.insertBefore(span, textNode);
    span.appendChild(textNode);
  } catch (e) {
    // Ignore if we can't wrap it
  }
}

// Run the script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', processFCFMatchReport);
} else {
  // Small delay to ensure any dynamic tables are loaded
  setTimeout(processFCFMatchReport, 500);
}
