let html = "__HTML_TAG_0__";
html = html.replace(/([a-zA-Z0-9])_\{([^}]+)\}/g, '$1<sub>$2</sub>');
html = html.replace(/([a-zA-Z0-9])_\(([^)]+)\)/g, '$1<sub>$2</sub>');
html = html.replace(/([a-zA-Z0-9])_([a-zA-Z0-9+\-]+)/g, '$1<sub>$2</sub>');
console.log(html);
