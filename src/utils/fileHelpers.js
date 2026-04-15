// utils/fileHelpers.js

export const getMimeType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'png') return 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'ogg' || ext === 'ogv') return 'audio/ogg';
    if (ext === 'wav') return 'audio/wav';
    if (ext === 'mp3') return 'audio/mpeg';
    return 'application/octet-stream';
  };
  
  export const sortTreeNodes = (nodes) => {
    nodes.sort((a, b) => {
      if (a.kind === 'directory' && b.kind !== 'directory') return -1;
      if (a.kind !== 'directory' && b.kind === 'directory') return 1;
      
      if (a.kind === 'file' && b.kind === 'file') {
        const getExt = (name) => name.includes('.') ? name.split('.').pop().toLowerCase() : '';
        const extA = getExt(a.name);
        const extB = getExt(b.name);
        if (extA !== extB) return extA.localeCompare(extB);
      }
      
      return a.name.localeCompare(b.name);
    });
  
    nodes.forEach(node => {
      if (node.kind === 'directory' && node.children) {
        sortTreeNodes(node.children);
      }
    });
    
    return nodes;
  };
  
  export const countFiles = (nodes) => {
    let count = 0;
    for (const node of nodes) {
      if (node.kind === 'file' && node.name.toLowerCase().endsWith('.json')) count++;
      else if (node.kind === 'directory' && node.children) count += countFiles(node.children);
    }
    return count;
  };