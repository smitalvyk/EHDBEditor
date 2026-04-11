import { ref } from 'vue';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

// ==========================================
// GLOBAL SHARED STATE (SINGLETON)
// ==========================================
// Moving these outside the function ensures ALL components share the exact same filesTree.
const filesTree = ref([]);
const rootHandle = ref(null);
const selectedFile = ref(null);
const selectedContent = ref('');
const fileType = ref('');
const availableProjects = ref([]);

export function useFileSystem() {
  const isNative = Capacitor.isNativePlatform();

  // ==========================================
  // NATIVE ANDROID LOGIC (CAPACITOR)
  // ==========================================
  
  const loadProjectsList = async () => {
    try {
      await Filesystem.mkdir({ path: 'ModProjects', directory: Directory.Documents, recursive: true }).catch(() => {});
      const result = await Filesystem.readdir({ path: 'ModProjects', directory: Directory.Documents });
      availableProjects.value = result.files.filter(f => f.type === 'directory').map(f => f.name);
    } catch (e) {
      console.error("Error loading native projects:", e);
      availableProjects.value = [];
    }
  };

  const createNewProject = async (projectName) => {
    try {
      await Filesystem.mkdir({ path: `ModProjects/${projectName}`, directory: Directory.Documents, recursive: true });
      await loadProjectsList();
    } catch (e) {
      alert("Error creating project: " + e.message);
    }
  };

  const openNativeProject = async (projectName) => {
    const basePath = `ModProjects/${projectName}`;
    rootHandle.value = { name: projectName, kind: 'directory', nativePath: basePath };

    const buildTree = async (currentPath) => {
      const result = await Filesystem.readdir({ path: currentPath, directory: Directory.Documents });
      const nodes = [];
      for (const file of result.files) {
        const fullPath = `${currentPath}/${file.name}`;
        if (file.type === 'directory') {
          nodes.push({
            name: file.name,
            kind: 'directory',
            nativePath: fullPath,
            children: await buildTree(fullPath),
            isOpen: false
          });
        } else {
          nodes.push({
            name: file.name,
            kind: 'file',
            nativePath: fullPath,
            fullPath: fullPath.replace(`${basePath}/`, ''), 
            handle: { kind: 'native', path: fullPath }
          });
        }
      }
      return nodes;
    };

    filesTree.value = await buildTree(basePath);
  };

  const getNativeImageUrl = async (nativePath) => {
    try {
      const result = await Filesystem.getUri({ path: nativePath, directory: Directory.Documents });
      return Capacitor.convertFileSrc(result.uri);
    } catch (e) { return null; }
  };

  // ==========================================
  // WEB LOGIC (PC BROWSER)
  // ==========================================

  const openDirectory = async () => {
    const handle = await window.showDirectoryPicker();
    rootHandle.value = handle;
    filesTree.value = await buildTree(handle);
  };

  const buildTree = async (dirHandle, pathPrefix = '') => {
    const nodes = [];
    for await (const entry of dirHandle.values()) {
      const currentPath = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
      if (entry.kind === 'directory') {
        nodes.push({ name: entry.name, kind: 'directory', handle: entry, children: await buildTree(entry, currentPath), isOpen: false });
      } else if (entry.kind === 'file') {
        nodes.push({ name: entry.name, kind: 'file', handle: entry, fullPath: currentPath });
      }
    }
    nodes.sort((a, b) => {
      if (a.kind === b.kind) return a.name.localeCompare(b.name);
      return a.kind === 'directory' ? -1 : 1;
    });
    return nodes;
  };

  // ==========================================
  // SMART DEEP IMAGE SEARCH
  // ==========================================
  
  const searchImageFile = (fileName) => {
    if (!fileName || filesTree.value.length === 0) return null;
    
    // Strip folder paths from the requested string (e.g., "image/WarpCore" -> "warpcore")
    const rawName = String(fileName).trim().replace(/\\/g, '/').split('/').pop().toLowerCase();
    
    // Strip extension if present to get the pure base name
    const baseName = rawName.includes('.') ? rawName.substring(0, rawName.lastIndexOf('.')) : rawName;

    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

    const searchNodes = (nodes) => {
      for (const node of nodes) {
        if (node.kind === 'file') {
          const nodeName = node.name.toLowerCase();
          const nodeNameNoExt = nodeName.includes('.') ? nodeName.substring(0, nodeName.lastIndexOf('.')) : nodeName;
          
          // Check if the file is an image and its base name matches the requested one
          const isImage = allowedExtensions.some(ext => nodeName.endsWith(ext));
          
          if (isImage && nodeNameNoExt === baseName) {
            return node.handle; 
          }
        } else if (node.kind === 'directory' && node.children) {
          const found = searchNodes(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    return searchNodes(filesTree.value);
  };

  // ==========================================
  // FILE READING & WRITING
  // ==========================================

  const readFileContent = async (handle) => {
    if (handle.kind === 'native') {
      const result = await Filesystem.readFile({ path: handle.path, directory: Directory.Documents, encoding: Encoding.UTF8 });
      return result.data;
    }
    const file = await handle.getFile();
    return await file.text();
  };

  const saveFileContent = async (handle, content) => {
    if (handle.kind === 'native') {
      await Filesystem.writeFile({ path: handle.path, data: content, directory: Directory.Documents, encoding: Encoding.UTF8 });
      return;
    }
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  };

  const selectFile = async (fileNode) => {
    selectedFile.value = fileNode;
    try {
      const nameLower = fileNode.name.toLowerCase();

      // FIX: Prevent reading audio/media files as text
      if (nameLower.endsWith('.ogg') || nameLower.endsWith('.ogv') || nameLower.endsWith('.wav') || nameLower.endsWith('.mp3')) {
        let fileObj;
        if (fileNode.fileObj) {
          fileObj = fileNode.fileObj;
        } else if (fileNode.handle && fileNode.handle.getFile) {
          fileObj = await fileNode.handle.getFile();
        }

        if (fileObj) {
          selectedContent.value = URL.createObjectURL(fileObj);
          fileType.value = 'audio';
        } else if (fileNode.handle && fileNode.handle.kind === 'native') {
          const result = await Filesystem.getUri({ path: fileNode.handle.path, directory: Directory.Documents });
          selectedContent.value = Capacitor.convertFileSrc(result.uri);
          fileType.value = 'audio';
        }
        return; // Exit here so it doesn't read text
      }

      // FIX: Prevent reading images as text
      if (nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg')) {
        fileType.value = 'image';
        // (You can add similar logic here if you want to preview images in the main editor window)
        return;
      }

      // Default logic for JSON / text files
      if (fileNode.fileObj) { 
        selectedContent.value = await fileNode.fileObj.text();
      } else {
        selectedContent.value = await readFileContent(fileNode.handle);
      }
      
      const match = selectedContent.value.match(/"ItemType"\s*:\s*(\d+)/);
      fileType.value = match ? match[1] : '';
    } catch (error) {
      console.error("Error reading file:", error);
      selectedContent.value = "Error reading file content.";
      fileType.value = '';
    }
  };

  const deleteFile = async (handle) => { console.log("Delete called on", handle); return true; };
  const moveFile = async (handle, folder, type) => { console.log("Move called on", handle); return true; };
  const copyFile = async (handle, folder, type) => { console.log("Copy called on", handle); return true; };

  return {
    isNative, availableProjects, loadProjectsList, createNewProject, openNativeProject, getNativeImageUrl, 
    openDirectory, filesTree, rootHandle, selectedFile, selectedContent, fileType, 
    selectFile, readFileContent, saveFileContent, deleteFile, moveFile, copyFile,
    searchImageFile 
  };
}