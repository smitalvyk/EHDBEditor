<script setup>
import { ref, shallowRef, computed, onMounted, watch, toRaw } from 'vue';

// Composables
import { useFileSystem } from './composables/useFileSystem';
import { useGameDatabase } from './composables/useGameDatabase';
import { useLocalization } from './composables/useLocalization'; 
import { useEditorNotes } from './composables/useEditorNotes'; 
import { useValidator } from './composables/useValidator';
import { useProjectDB } from './composables/useProjectDB';
import { useDevConsole } from './composables/useDevConsole';

// Utils
import { getMimeType, sortTreeNodes, countFiles } from './utils/fileHelpers';

// Components
import FileTreeItem from './components/FileTreeItem.vue';
import FilePreview from './components/FilePreview.vue';
import EditorModal from './components/EditorModal.vue';
import VisualEditorModal from './components/VisualEditorModal.vue';
import XmlLocalizationEditor from './components/XmlLocalizationEditor.vue';
import DiagnosticsModal from './components/DiagnosticsModal.vue';
import CreateItemModal from './components/CreateItemModal.vue';

// Libraries
import JSZip from 'jszip';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

// Init Composables
const { 
  isNative, availableProjects, loadProjectsList, createNewProject, openNativeProject,
  openDirectory, filesTree, rootHandle, selectedFile, selectedContent, fileType, 
  selectFile, readFileContent, saveFileContent
} = useFileSystem();

const { clearDatabase, registerItem, printStats } = useGameDatabase();
const { loadAllDictionaries, isLoadingDicts } = useLocalization();
const { initNotes } = useEditorNotes(); 
const { runChecks } = useValidator();
const { clearProjectDB, saveToProjectDB, updateSingleFileInDB, getFileFromDB, getAllFilesFromDB } = useProjectDB();
const { isConsoleOpen, appLogs, startLongPressTimer, cancelLongPress, setupConsoleInterceptor } = useDevConsole();

// App State
const isEditorOpen = ref(false);
const isVisualOpen = ref(false);
const isScanning = ref(false);
const isSidebarOpen = ref(false); 
const isProjectModalOpen = ref(false);
const newProjectName = ref('');

// Modals State
const isCreateModalOpen = ref(false);
const contextMenuTarget = ref(null);
const deleteTarget = ref(null);
const deleteCount = ref(0);
const activeCreatePath = ref('');

// ZIP State
const isZipMode = ref(false);
const zipFileInput = ref(null);

// Scanning Progress
const scanProgress = ref(0);
const totalFilesToScan = ref(0);
const filesScanned = ref(0);

// Diagnostics State
const isSettingsOpen = ref(false);
const isValidatorOpen = ref(false); 
const isValidatorLoading = ref(false); 
const validationErrors = shallowRef([]);  
const validatorSettings = ref({
  checkMissingRefs: true,
  checkClamps: true,
  checkAiLogic: true,
  fixClamps: true,
  fixStubs: true,
  fixEnums: false
});

const handleRunScanner = () => {
  isValidatorLoading.value = true;
  setTimeout(() => {
    validationErrors.value = runChecks(validatorSettings.value);
    isValidatorLoading.value = false;
  }, 50);
};

const findNodeByPath = (nodes, targetPath) => {
  if (!targetPath) return null;
  const target = String(targetPath).trim();
  const targetWithExt = target.endsWith('.json') ? target : `${target}.json`;
  for (const node of nodes) {
    if (node.fullPath === target || node.name === target || node.name === targetWithExt) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
};

const openFileFromError = (err) => {
  if (!err || !err.path) return;
  const node = findNodeByPath(filesTree.value, err.path);
  if (node) {
    handleSelectFile(node);
    isValidatorOpen.value = false;
    setTimeout(() => { isVisualOpen.value = true; }, 150);
  }
};

// --- Context Menu & Delete Logic ---
const openContextMenu = (item) => {
  contextMenuTarget.value = item;
};

const onContextCreate = () => {
  let path = 'Database';
  if (contextMenuTarget.value) {
    const target = contextMenuTarget.value;
    if (target.kind === 'directory') {
       path = target.fullPath || target.name;
    } else {
       const parts = (target.fullPath || target.name).split('/');
       parts.pop();
       path = parts.join('/') || 'Database';
    }
  }
  activeCreatePath.value = path;
  isCreateModalOpen.value = true;
  contextMenuTarget.value = null;
};

const countFilesInside = (node) => {
  if (node.kind === 'file') return 1;
  let count = 0;
  if (node.children) {
    node.children.forEach(c => { count += countFilesInside(c); });
  }
  return count;
};

const onContextDelete = () => {
  deleteTarget.value = contextMenuTarget.value;
  deleteCount.value = countFilesInside(contextMenuTarget.value);
  contextMenuTarget.value = null;
};

const executeDelete = async () => {
  const target = toRaw(deleteTarget.value);
  if (!target) return;

  const pathToDelete = target.fullPath || target.name;
  
  try {
    if (isZipMode.value) {
      const allFiles = await getAllFilesFromDB();
      for (const file of allFiles) {
         if (file.fullPath === pathToDelete || file.fullPath.startsWith(pathToDelete + '/')) {
            await updateSingleFileInDB(file.fullPath, null); 
         }
      }
    } else if (isNative) {
       if (target.kind === 'file') {
          await Filesystem.deleteFile({ path: `${rootHandle.value.name}/${pathToDelete}`, directory: Directory.Documents });
       } else {
          await Filesystem.rmdir({ path: `${rootHandle.value.name}/${pathToDelete}`, directory: Directory.Documents, recursive: true });
       }
    }

    const removeFromTree = (nodes, targetName) => {
       const idx = nodes.findIndex(n => n.name === targetName);
       if (idx !== -1) {
          nodes.splice(idx, 1);
          return true;
       }
       for (const node of nodes) {
          if (node.children && removeFromTree(node.children, targetName)) return true;
       }
       return false;
    };
    
    removeFromTree(filesTree.value, target.name);
    filteredFilesTree.value = [...filesTree.value];

    if (selectedFile.value && (selectedFile.value.name === target.name || (selectedFile.value.fullPath && selectedFile.value.fullPath.startsWith(pathToDelete)))) {
       selectedFile.value = null;
       selectedContent.value = '';
    }

  } catch (e) {
    console.error("Deletion error:", e);
    alert("Failed to delete the item from the file system.");
  } finally {
    deleteTarget.value = null;
    startIndexing(); 
  }
};

const injectNodeIntoTree = (nodes, pathParts, fullPath, forceDirectory = false) => {
  const part = pathParts[0];
  const isLastPart = pathParts.length === 1;
  const isFile = isLastPart && !forceDirectory;

  let existingNode = nodes.find(n => n.name === part && n.kind === (isFile ? 'file' : 'directory'));

  if (!existingNode) {
    if (isFile) {
      existingNode = {
        name: part,
        kind: 'file',
        fullPath: fullPath,
        handle: {
          kind: 'file',
          name: part,
          getFile: async () => {
            const fileBlob = await getFileFromDB(fullPath);
            return new File([fileBlob], part, { type: getMimeType(part) });
          }
        }
      };
      nodes.push(existingNode);
    } else {
      existingNode = { name: part, kind: 'directory', children: [], isOpen: true, fullPath: isLastPart ? fullPath : undefined };
      nodes.push(existingNode);
    }
    sortTreeNodes(nodes);
  } else if (!isFile && isLastPart) {
     existingNode.isOpen = true;
  }

  if (!isLastPart) {
    injectNodeIntoTree(existingNode.children, pathParts.slice(1), fullPath, forceDirectory);
  }
};

const currentFolderSuggestion = computed(() => {
  if (!selectedFile.value) return 'Database';
  const path = selectedFile.value.fullPath || selectedFile.value.name;
  const parts = path.split('/');
  if (selectedFile.value.kind === 'file') parts.pop();
  return parts.join('/') || 'Database';
});


const openCreateModalGlobal = () => {
  activeCreatePath.value = currentFolderSuggestion.value;
  isCreateModalOpen.value = true;
};

const availableDirectories = computed(() => {
  const dirs = [''];
  const traverse = (nodes, currentPath = '') => {
    for (const node of nodes) {
      if (node.kind === 'directory') {
        const path = currentPath ? `${currentPath}/${node.name}` : node.name;
        dirs.push(path);
        if (node.children) traverse(node.children, path);
      }
    }
  };
  traverse(filesTree.value);
  if (dirs.length === 1) dirs.push('Database'); 
  return dirs;
});

const handleCreateNewItem = async (payload) => {
  const { mode, path, content } = payload;
  
  try {
    if (mode === 'file') {
      await createNewFileInSystem(path, content);
      registerItem(content, path.split('/').pop(), path);
      injectNodeIntoTree(filesTree.value, path.split('/'), path, false);
      
      const newNode = findNodeByPath(filesTree.value, path);
      if (newNode) handleSelectFile(newNode);
      
    } else if (mode === 'folder') {
      if (isNative) {
        await Filesystem.mkdir({
          path: `${rootHandle.value.name}/${path}`,
          directory: Directory.Documents,
          recursive: true
        });
      } else if (!isZipMode.value) {
        const parts = path.split('/');
        let currentDir = rootHandle.value;
        for (const part of parts) {
          currentDir = await currentDir.getDirectoryHandle(part, { create: true });
        }
      }
      injectNodeIntoTree(filesTree.value, path.split('/'), path, true);
    }
    
    filteredFilesTree.value = [...filesTree.value];
    isCreateModalOpen.value = false;
  } catch (e) {
    console.error(e);
    alert(`Failed to create ${mode}`);
  }
};

const createNewFileInSystem = async (fullPath, content) => {
  if (isZipMode.value) {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    await updateSingleFileInDB(fullPath, blob);
  } else if (isNative) {
    await Filesystem.writeFile({
      path: `${rootHandle.value.name}/${fullPath}`,
      data: content,
      directory: Directory.Documents,
      encoding: 'utf8',
      recursive: true
    });
  } else {
    const parts = fullPath.split('/');
    const fileName = parts.pop();
    let currentDir = rootHandle.value;
    
    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    }
    const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }
};

const handleSingleFix = async (err) => {
  if (!err || !err.fixInfo) return;
  
  if (err.fixInfo.type === 'create_stub') {
    const newContent = JSON.stringify(err.fixInfo.stubData, null, 2);
    try {
      await createNewFileInSystem(err.fixInfo.stubPath, newContent);
      registerItem(newContent, err.fixInfo.stubPath.split('/').pop(), err.fixInfo.stubPath);
      injectNodeIntoTree(filesTree.value, err.fixInfo.stubPath.split('/'), err.fixInfo.stubPath);
      filteredFilesTree.value = [...filesTree.value]; 

      handleRunScanner();
      alert(`Stub component created at ${err.fixInfo.stubPath}`);
    } catch (e) {
      console.error(e);
      alert("Failed to create the file.");
    }
    return;
  }

  err.fixInfo.applyFix();
  const newContent = JSON.stringify(err.itemRef.data, null, 2);
  
  if (isZipMode.value) {
    const blob = new Blob([newContent], { type: 'application/json;charset=utf-8' });
    await updateSingleFileInDB(err.path, blob);
  } else {
    const node = findNodeByPath(filesTree.value, err.path);
    if (node && node.handle) await saveFileContent(node.handle, newContent);
  }
  
  registerItem(newContent, err.fileName, err.path);
  handleRunScanner(); 
};

const handleBulkFix = async (errorsToFix) => {
  let count = 0;
  let stubCount = 0;
  const filesToSave = new Map();
  let treeChanged = false;

  for (const err of errorsToFix) {
     if (err?.fixInfo) {
        if (err.fixInfo.type === 'create_stub') {
           const newContent = JSON.stringify(err.fixInfo.stubData, null, 2);
           try {
              await createNewFileInSystem(err.fixInfo.stubPath, newContent);
              registerItem(newContent, err.fixInfo.stubPath.split('/').pop(), err.fixInfo.stubPath);
              injectNodeIntoTree(filesTree.value, err.fixInfo.stubPath.split('/'), err.fixInfo.stubPath);
              treeChanged = true;
              stubCount++;
           } catch (e) {
              console.error(e);
           }
        } else {
           err.fixInfo.applyFix();
           filesToSave.set(err.path, err); 
           count++;
        }
     }
  }

  if (treeChanged) {
     filteredFilesTree.value = [...filesTree.value];
  }

  if (count === 0 && stubCount === 0) {
     alert("No fixable issues found in the current list.");
     return;
  }

  for (const [path, err] of filesToSave.entries()) {
     const newContent = JSON.stringify(err.itemRef.data, null, 2);
     if (isZipMode.value) {
        const blob = new Blob([newContent], { type: 'application/json;charset=utf-8' });
        await updateSingleFileInDB(path, blob);
     } else {
        const node = findNodeByPath(filesTree.value, path);
        if (node && node.handle) await saveFileContent(node.handle, newContent);
     }
     registerItem(newContent, err.fileName, path);
  }
  
  alert(`Successfully applied ${count} auto-fixes and created ${stubCount} stubs!`);
  handleRunScanner();
};

const startLongPress = () => startLongPressTimer(() => { isSettingsOpen.value = false; });

// Settings Storage
const isDark = ref(localStorage.getItem('theme') !== 'light');
const showEditorNotes = ref(localStorage.getItem('showEditorNotes') !== 'false');
const sortJsonOnSave = ref(localStorage.getItem('sortJsonOnSave') !== 'false');

watch(isDark, (val) => { localStorage.setItem('theme', val ? 'dark' : 'light'); updateThemeClass(); });
watch(showEditorNotes, (val) => { localStorage.setItem('showEditorNotes', val); });
watch(sortJsonOnSave, (val) => { localStorage.setItem('sortJsonOnSave', val); });

// Search State
const searchQuery = ref('');
const isContentSearch = ref(false); 
const isSearching = ref(false);     
const filteredFilesTree = ref([]);  
let searchTimeout = null;

// ZIP File Loading Logic
const triggerZipSelect = async () => {
  const existingFiles = await getAllFilesFromDB();
  if (existingFiles.length > 0) {
    const confirmOverwrite = confirm("You already have an open project. Loading a new one will erase unsaved data. Did you export your old project?");
    if (!confirmOverwrite) return;
  }
  if (zipFileInput.value) zipFileInput.value.click();
};

const handleZipSelect = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  isScanning.value = true;
  isZipMode.value = true;
  scanProgress.value = 0;
  filesScanned.value = 0;
  rootHandle.value = { name: file.name, kind: 'archive' };

  try {
    await clearProjectDB();
    const zip = await JSZip.loadAsync(file);
    
    const entries = Object.keys(zip.files).filter(p => !zip.files[p].dir);
    const dbFiles = [];
    const root = [];
    totalFilesToScan.value = entries.length;

    for (let i = 0; i < entries.length; i++) {
      const relativePath = entries[i];
      const zipEntry = zip.files[relativePath];
      
      const blob = await zipEntry.async('blob');
      dbFiles.push({ fullPath: relativePath, data: blob });

      const parts = relativePath.split('/');
      let currentLevel = root;
      for (let j = 0; j < parts.length; j++) {
        const part = parts[j];
        if (j === parts.length - 1) {
          currentLevel.push({ 
            name: part, 
            kind: 'file', 
            fullPath: relativePath,
            handle: {
              kind: 'file',
              name: part,
              getFile: async () => {
                const fileBlob = await getFileFromDB(relativePath);
                return new File([fileBlob], part, { type: getMimeType(part) });
              }
            }
          });
        } else {
          let existingDir = currentLevel.find(d => d.name === part && d.kind === 'directory');
          if (!existingDir) {
            existingDir = { name: part, kind: 'directory', children: [], isOpen: false };
            currentLevel.push(existingDir);
          }
          currentLevel = existingDir.children;
        }
      }
      
      filesScanned.value++;
      scanProgress.value = Math.floor((filesScanned.value / totalFilesToScan.value) * 100);
    }
    
    await saveToProjectDB(dbFiles);
    filesTree.value = sortTreeNodes(root);
    searchQuery.value = '';
    filteredFilesTree.value = filesTree.value;
    clearDatabase();
    
    setTimeout(async () => {
      await scanAllFiles(filesTree.value, '');
      await loadAllDictionaries();
      isScanning.value = false;
      printStats();
    }, 100);
    
  } catch (e) {
    console.error("Failed to load ZIP:", e);
    isScanning.value = false;
    alert("Failed to read the ZIP file.");
  }
  
  event.target.value = '';
};

const exportZip = async () => {
  if (!isZipMode.value) return;
  
  try {
    const zip = new JSZip();
    const allFiles = await getAllFilesFromDB();
    
    allFiles.forEach(file => {
      zip.file(file.fullPath, file.data);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = rootHandle.value.name.replace('.zip', '_modded.zip');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Export ZIP error:", e);
    alert("Failed to export ZIP file.");
  }
};

// Directory Loading Logic
const handleOpenFolder = async () => {
  if (isNative) {
    await loadProjectsList();
    isProjectModalOpen.value = true;
  } else {
    if (isZipMode.value) {
      const confirmOverwrite = confirm("You have a ZIP project open in memory. Switching to folder mode will close it. Did you export your ZIP?");
      if (!confirmOverwrite) return;
    }

    try {
      await openDirectory();
      isZipMode.value = false;
      await clearProjectDB(); 
      startIndexing();
    } catch (e) {
      console.warn("Folder selection aborted or failed", e);
    }
  }
};

const loadAndroidProject = async (projectName) => {
  isProjectModalOpen.value = false;
  isScanning.value = true;
  isZipMode.value = false;
  scanProgress.value = 0;
  filesScanned.value = 0;
  await openNativeProject(projectName);
  startIndexing();
};

const createProject = async () => {
  if (!newProjectName.value.trim()) return;
  await createNewProject(newProjectName.value.trim());
  newProjectName.value = '';
};

const startIndexing = () => {
  if (filesTree.value.length > 0) {
    searchQuery.value = '';
    filteredFilesTree.value = filesTree.value;
    isScanning.value = true;
    scanProgress.value = 0;
    filesScanned.value = 0;
    totalFilesToScan.value = countFiles(filesTree.value);
    clearDatabase();
    setTimeout(async () => {
      if (rootHandle.value && !isZipMode.value) await initNotes(rootHandle.value);
      await scanAllFiles(filesTree.value, '');
      await loadAllDictionaries();
      isScanning.value = false;
      printStats();
    }, 100);
  }
};

const scanAllFiles = async (nodes, pathPrefix = '') => {
  for (const node of nodes) {
    const currentPath = pathPrefix ? `${pathPrefix}/${node.name}` : node.name;
    node.fullPath = currentPath;
    
    if (node.kind === 'directory' && node.children) {
      await scanAllFiles(node.children, currentPath);
    } else if (node.kind === 'file' && node.name.toLowerCase().endsWith('.json')) {
      try {
        let text = '';
        if (isZipMode.value) {
          const blob = await getFileFromDB(currentPath);
          if (blob) text = await blob.text();
        } else if (node.handle) {
          text = await readFileContent(node.handle); 
        }
        
        if (text) {
           const fixedText = registerItem(text, node.name, currentPath);
           if (fixedText && typeof fixedText === 'string') {
              if (isZipMode.value) {
                 const blob = new Blob([fixedText], { type: 'application/json;charset=utf-8' });
                 await updateSingleFileInDB(currentPath, blob);
              } else if (node.handle) {
                 await saveFileContent(node.handle, fixedText);
              }
              console.log(`Silently auto-fixed and saved: ${node.name}`);
           }
        }
      } catch (e) { 
        console.error("Indexing error:", node.name, e); 
      } finally {
        if (!isZipMode.value) {
          filesScanned.value++;
          if (totalFilesToScan.value > 0) {
            scanProgress.value = Math.floor((filesScanned.value / totalFilesToScan.value) * 100);
          }
        }
      }
    }
  }
};

const handleSave = async (newContent) => {
  if (selectedFile.value) {
    if (isZipMode.value) {
      const blob = new Blob([newContent], { type: 'application/json;charset=utf-8' });
      await updateSingleFileInDB(selectedFile.value.fullPath, blob);
    } 
    else if (selectedFile.value.handle) {
      await saveFileContent(selectedFile.value.handle, newContent);
    }
  }
  
  selectedContent.value = newContent;
  if (selectedFile.value && selectedFile.value.name.endsWith('.json')) {
    const path = selectedFile.value.fullPath || selectedFile.value.name;
    registerItem(newContent, selectedFile.value.name, path);
  }
  isEditorOpen.value = false;
  isVisualOpen.value = false;
};

// Memory Cleanup for Media files
let currentMediaUrl = null;

const handleSelectFile = async (fileNode) => {
  selectedFile.value = fileNode;
  isSidebarOpen.value = false; 
  
  try {
    if (currentMediaUrl) {
      URL.revokeObjectURL(currentMediaUrl);
      currentMediaUrl = null;
    }

    const nameLower = fileNode.name.toLowerCase();
    const isAudio = nameLower.endsWith('.ogg') || nameLower.endsWith('.ogv') || nameLower.endsWith('.wav') || nameLower.endsWith('.mp3');
    const isImage = nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg');

    if (isAudio || isImage) {
      if (isZipMode.value) {
        const blob = await getFileFromDB(fileNode.fullPath);
        if (blob) {
            currentMediaUrl = URL.createObjectURL(blob);
            selectedContent.value = currentMediaUrl;
            fileType.value = isImage ? 'image' : 'audio';
        }
      } else {
         if (isImage) {
             fileType.value = 'image';
         } else {
             selectFile(fileNode); 
             fileType.value = 'audio';
         }
      }
      return; 
    }

    if (isZipMode.value) {
      const blob = await getFileFromDB(fileNode.fullPath);
      if (blob) selectedContent.value = await blob.text();
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

// Initial Boot (Cache check)
onMounted(async () => { 
  updateThemeClass(); 
  setupConsoleInterceptor();

  try {
    const existingFiles = await getAllFilesFromDB();
    if (existingFiles.length > 0) {
      isZipMode.value = true;
      rootHandle.value = { name: 'Saved Web Project', kind: 'archive' };
      
      const root = [];
      existingFiles.forEach(file => {
        const parts = file.fullPath.split('/');
        let currentLevel = root;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (i === parts.length - 1) {
            currentLevel.push({ 
              name: part, 
              kind: 'file', 
              fullPath: file.fullPath,
              handle: {
                kind: 'file',
                name: part,
                getFile: async () => {
                  const fileBlob = await getFileFromDB(file.fullPath);
                  return new File([fileBlob], part, { type: getMimeType(part) });
                }
              }
            });
          } else {
            let existingDir = currentLevel.find(d => d.name === part && d.kind === 'directory');
            if (!existingDir) {
              existingDir = { name: part, kind: 'directory', children: [], isOpen: false };
              currentLevel.push(existingDir);
            }
            currentLevel = existingDir.children;
          }
        }
      });
      
      filesTree.value = sortTreeNodes(root);
      filteredFilesTree.value = filesTree.value;
      totalFilesToScan.value = countFiles(root);
      isScanning.value = true;
      clearDatabase();
      
      setTimeout(async () => {
        await scanAllFiles(root, '');
        await loadAllDictionaries();
        isScanning.value = false;
        printStats();
      }, 100);
    }
  } catch (e) {
    console.error("Failed to load cached project:", e);
  }
});

// Search Logic
const checkFileMatch = async (node, lowerQuery) => {
  if (node.name.toLowerCase().includes(lowerQuery)) return true;
  if (isContentSearch.value) {
    const ext = node.name.split('.').pop().toLowerCase();
    if (['json', 'xml', 'txt', 'js', 'md'].includes(ext)) {
      try {
        let content = '';
        if (isZipMode.value) {
          const blob = await getFileFromDB(node.fullPath);
          if (blob) content = await blob.text();
        } else if (node.handle) {
          content = await readFileContent(node.handle);
        }
        if (content && content.toLowerCase().includes(lowerQuery)) return true;
      } catch (e) {}
    }
  }
  return false;
};

const filterNodesAsync = async (nodes, query) => {
  const lowerQuery = query.toLowerCase();
  const results = [];
  for (const node of nodes) {
    if (node.kind === 'directory') {
      const filteredChildren = await filterNodesAsync(node.children || [], query);
      const matchesFolderName = node.name.toLowerCase().includes(lowerQuery);
      if (filteredChildren.length > 0 || matchesFolderName) {
        results.push({ ...node, children: filteredChildren, isOpen: (query && filteredChildren.length > 0) ? true : node.isOpen });
      }
    } else if (node.kind === 'file') {
      const isMatch = await checkFileMatch(node, lowerQuery);
      if (isMatch) results.push(node);
    }
  }
  return results;
};

const performSearch = () => {
  if (!searchQuery.value.trim()) {
    filteredFilesTree.value = filesTree.value;
    isSearching.value = false;
    return;
  }
  isSearching.value = true;
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      const results = await filterNodesAsync(filesTree.value, searchQuery.value);
      filteredFilesTree.value = results;
    } catch (e) { console.error("Search error:", e); } 
    finally { isSearching.value = false; }
  }, 600);
};

watch([searchQuery, isContentSearch], () => performSearch());
watch(filesTree, () => { filteredFilesTree.value = filesTree.value; });

const toggleTheme = () => { isDark.value = !isDark.value; };
const updateThemeClass = () => document.documentElement.classList.toggle('dark-theme', isDark.value);
const toggleSidebar = () => { isSidebarOpen.value = !isSidebarOpen.value; };

</script>

<template>
  <div class="window-container">
    
    <input type="file" accept=".zip" ref="zipFileInput" style="display: none" @change="handleZipSelect" />

    <header class="toolbar">
      <button class="btn-icon mobile-menu-btn" @click="toggleSidebar">☰</button>
      <div class="window-title">EHDBEditor</div>
      
      <div class="actions">
        <button @click="handleOpenFolder" class="btn-primary mobile-hidden" :disabled="isScanning" v-if="!isNative">
          <span v-if="isScanning && !isZipMode">
            {{ isLoadingDicts ? '📖 Dictionaries...' : `⏳ Scanning... ${scanProgress}%` }}
          </span>
          <span v-else>📂 Open Folder</span>
        </button>

        <button @click="triggerZipSelect" class="btn-primary btn-zip" :disabled="isScanning">
           <span v-if="isScanning && isZipMode && !isLoadingDicts">⏳ Extracting... {{ scanProgress }}%</span>
           <span v-else>📦 {{ isZipMode ? 'New ZIP' : 'Open ZIP' }}</span>
        </button>
        
        <button @click="exportZip" class="btn-primary btn-export-zip" v-if="isZipMode">
           💾 Export ZIP
        </button>

        <button @click="isValidatorOpen = true" class="btn-icon" title="Diagnostics">🩺</button>
        
        <button 
          @mousedown="startLongPress" 
          @mouseup="cancelLongPress" 
          @mouseleave="cancelLongPress"
          @touchstart="startLongPress"
          @touchend="cancelLongPress"
          @click="isSettingsOpen = true" 
          class="btn-icon" 
          title="Settings (Hold 3s for Console)"
        >⚙️</button>

      </div>

      <div class="path-breadcumbs mobile-hidden" v-if="rootHandle">
        <span v-if="isZipMode">📦 </span> {{ rootHandle.name }} <span v-if="selectedFile"> / {{ selectedFile.name }}</span>
      </div>
    </header>

    <div class="main-area">
      <div class="sidebar-backdrop" :class="{ show: isSidebarOpen }" @click="isSidebarOpen = false"></div>

      <aside class="sidebar" :class="{ 'mobile-open': isSidebarOpen }">
        <div class="search-panel">
          <div class="search-box">
            <input type="text" v-model="searchQuery" placeholder="🔍 Search..." class="search-input">
          </div>
          <div class="search-options">
            <label class="toggle-row">
              <span class="toggle-label">In content</span>
              <div class="toggle-switch small-switch">
                <input type="checkbox" v-model="isContentSearch">
                <span class="slider"></span>
              </div>
            </label>
            <button class="btn-icon add-btn" @click="openCreateModalGlobal" title="New File/Folder" :disabled="!rootHandle">➕</button>
          </div>
        </div>

        <div v-if="isSearching" class="search-status">⏳ Searching...</div>
        <div v-else-if="filteredFilesTree.length" class="tree-content">
          <FileTreeItem 
            v-for="item in filteredFilesTree" 
            :key="item.name" 
            :item="item" 
            @select="handleSelectFile" 
            @item-context="openContextMenu"
          />
        </div>
        <div v-else class="empty-state">{{ searchQuery ? 'No results found' : 'No files' }}</div>
      </aside>

      <main class="content-view">
        <FilePreview 
           v-if="selectedFile"
           :file="selectedFile"
           :content="selectedContent"
           :type="fileType"
           :showEditorNotes="showEditorNotes" 
           @open-editor="isEditorOpen = true"
           @open-visual="isVisualOpen = true"
        />
        <div v-else class="empty-view">Select a file</div>
      </main>
    </div>

    <EditorModal :isOpen="isEditorOpen" :file="selectedFile" :content="selectedContent" :type="fileType" @close="isEditorOpen = false" @save="handleSave" />
    <VisualEditorModal :isOpen="isVisualOpen && Boolean(selectedFile?.name.toLowerCase().endsWith('.json'))" :content="selectedContent" :fileName="selectedFile ? selectedFile.name : ''" :showEditorNotes="showEditorNotes" :sortJsonOnSave="sortJsonOnSave" @close="isVisualOpen = false" @save="handleSave" />
    <XmlLocalizationEditor :isOpen="isVisualOpen && Boolean(selectedFile?.name.toLowerCase().endsWith('.xml'))" :content="selectedContent" :fileName="selectedFile ? selectedFile.name : ''" @close="isVisualOpen = false" @save="handleSave" />

    <CreateItemModal 
      :isOpen="isCreateModalOpen" 
      :currentPath="activeCreatePath"
      :directories="availableDirectories"
      @close="isCreateModalOpen = false" 
      @create="handleCreateNewItem" 
    />

    <DiagnosticsModal
      :isOpen="isValidatorOpen"
      :isLoading="isValidatorLoading"
      :validationErrors="validationErrors"
      :settings="validatorSettings"
      @update:settings="validatorSettings = $event"
      @close="isValidatorOpen = false"
      @run-scan="handleRunScanner"
      @fix-single="handleSingleFix"
      @fix-bulk="handleBulkFix"
      @open-file="openFileFromError"
    />

    <Teleport to="body">
      <div v-if="isConsoleOpen" class="modal-overlay" @click.self="isConsoleOpen = false">
        <div class="settings-modal large-modal">
          <div class="settings-header">
            <h3>💻 Developer Console</h3>
            <button @click="isConsoleOpen = false" class="btn-icon close-btn">✖</button>
          </div>
          <div class="settings-body" style="padding: 10px; background: #111;">
            <div class="console-logs">
              <div v-if="appLogs.length === 0" style="color: #666; font-style: italic;">No logs recorded yet...</div>
              <div v-for="(log, i) in appLogs" :key="i" class="log-entry" :class="'log-' + log.type">
                <span class="log-time">[{{ log.time }}]</span> <span class="log-msg">{{ log.message }}</span>
              </div>
            </div>
            <button @click="appLogs = []" class="btn-secondary" style="width: 100%; margin-top: 10px;">Clear Console</button>
          </div>
        </div>
      </div>

      <div v-if="isProjectModalOpen" class="modal-overlay" @click.self="isProjectModalOpen = false">
        <div class="settings-modal" style="width: 400px;">
          <div class="settings-header">
            <h3>📁 My Projects (Documents/ModProjects)</h3>
            <button @click="isProjectModalOpen = false" class="btn-icon close-btn">✖</button>
          </div>
          <div class="settings-body">
            
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
              <input type="text" v-model="newProjectName" placeholder="New project name..." class="search-input" />
              <button @click="createProject" class="btn-primary">Create</button>
            </div>

            <div class="errors-list" style="max-height: 40vh;">
              <div v-if="availableProjects.length === 0" class="empty-msg">
                No projects found. Create one above!
              </div>
              <button 
                v-for="proj in availableProjects" :key="proj"
                @click="loadAndroidProject(proj)"
                class="btn-secondary" style="width: 100%; text-align: left; padding: 15px; font-size: 16px; margin-bottom: 5px; display: flex; align-items: center; gap: 10px;"
              >
                🗂️ {{ proj }}
              </button>
            </div>
            
          </div>
        </div>
      </div>
      
      <div v-if="isSettingsOpen" class="modal-overlay" @click.self="isSettingsOpen = false">
        <div class="settings-modal">
          <div class="settings-header">
            <h3>⚙️ Settings</h3>
            <button @click="isSettingsOpen = false" class="btn-icon close-btn">✖</button>
          </div>
          <div class="settings-body">
            <div class="setting-item">
              <span>Theme</span>
              <button @click="toggleTheme" class="btn-secondary">{{ isDark ? '🌙 Dark' : '☀️ Light' }}</button>
            </div>
            <label class="setting-item cursor-pointer">
              <span>Show Editor Note</span>
              <div class="toggle-switch">
                <input type="checkbox" v-model="showEditorNotes">
                <span class="slider"></span>
              </div>
            </label>
            <label class="setting-item cursor-pointer">
              <span>Sort JSON by schema</span>
              <div class="toggle-switch">
                <input type="checkbox" v-model="sortJsonOnSave">
                <span class="slider"></span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div v-if="contextMenuTarget" class="modal-overlay" @click.self="contextMenuTarget = null">
        <div class="mini-confirm-card" style="border-color: var(--accent-color);">
          <h4 style="color: var(--accent-color);">{{ contextMenuTarget.name }}</h4>
          <div class="context-menu-actions" style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
             <button class="btn-primary" @click="onContextCreate" style="padding: 10px; justify-content: flex-start;">➕ Create New Inside</button>
             <button class="btn-danger" @click="onContextDelete" style="padding: 10px; justify-content: flex-start;">🗑️ Delete</button>
             <button class="btn-secondary" @click="contextMenuTarget = null" style="padding: 10px; justify-content: flex-start;">Cancel</button>
          </div>
        </div>
      </div>

      <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
        <div class="mini-confirm-card" style="border-color: #ff5555;">
          <h4 style="color: #ff5555;">Delete {{ deleteTarget.kind === 'file' ? 'File' : 'Folder' }}?</h4>
          <p style="color: #fff;">
            Are you sure you want to permanently delete: <br>
            <b style="color: #ff8585;">{{ deleteTarget.name }}</b>
          </p>
          <p v-if="deleteTarget.kind === 'directory'" style="font-size: 12px; color: #aaa;">
            This will also delete <b>{{ deleteCount }}</b> file(s) inside this folder!
          </p>
          <div class="confirm-btns">
            <button class="btn-danger" @click="executeDelete">Yes, Delete</button>
            <button class="btn-secondary" @click="deleteTarget = null">Cancel</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style>
/* Global Styles */
:root {
  --app-bg: #f3f3f3;
  --sidebar-bg: rgba(255, 255, 255, 0.8);
  --content-bg: #ffffff;
  --text-primary: #1a1a1a;
  --text-secondary: #5f5f5f;
  --accent-color: #0067c0;
  --item-hover: rgba(0, 0, 0, 0.05);
  --border-light: rgba(0, 0, 0, 0.1);
  --radius-lg: 8px;
  --radius-sm: 4px;
}

:root.dark-theme {
  --app-bg: #202020;
  --sidebar-bg: #2a2a2a;
  --content-bg: #272727;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --accent-color: #60cdff;
  --item-hover: rgba(255, 255, 255, 0.08);
  --border-light: rgba(255, 255, 255, 0.08);
}

body { margin: 0; font-family: 'Segoe UI', sans-serif; background: var(--app-bg); color: var(--text-primary); overflow: hidden; transition: background 0.3s, color 0.3s; }
.window-container { display: flex; flex-direction: column; height: 100vh; }

.toolbar { height: 50px; display: flex; align-items: center; padding: 0 10px; background: var(--sidebar-bg); border-bottom: 1px solid var(--border-light); gap: 10px; z-index: 20; position: relative; }
.actions { display: flex; gap: 8px; margin-left: auto; } 
.window-title { font-weight: 600; font-size: 14px; white-space: nowrap; }

.btn-primary { background: var(--content-bg); color: var(--text-primary); border: 1px solid var(--border-light); padding: 6px 12px; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: all 0.2s; min-width: 100px; display: flex; justify-content: center; }
.btn-primary:hover:not(:disabled) { background: var(--item-hover); }
.btn-primary:disabled { opacity: 0.7; cursor: wait; }
.btn-icon { background: transparent; border: none; cursor: pointer; font-size: 18px; padding: 6px; border-radius: var(--radius-sm); color: var(--text-primary); user-select: none; -webkit-user-select: none;}
.btn-icon:hover { background: var(--item-hover); }
.btn-icon:disabled { opacity: 0.3; cursor: not-allowed; }

.add-btn { font-size: 14px; padding: 2px 6px; border: 1px solid var(--border-light); border-radius: 4px;}

.btn-zip { background: #3b82f6; color: white; border-color: #2563eb; }
.btn-zip:hover:not(:disabled) { background: #2563eb; }
.btn-export-zip { background: #10b981; color: white; border-color: #059669; }
.btn-export-zip:hover:not(:disabled) { background: #059669; }

.path-breadcumbs { font-size: 12px; color: var(--text-secondary); border-left: 1px solid var(--border-light); padding-left: 10px; margin-left: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.main-area { display: flex; flex: 1; overflow: hidden; padding: 8px; gap: 8px; position: relative; }

.sidebar { 
  width: 280px; background: var(--sidebar-bg); border-radius: var(--radius-lg); 
  display: flex; flex-direction: column; overflow-y: auto; border: 1px solid var(--border-light); 
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); z-index: 10;
}

.content-view { flex: 1; background: var(--content-bg); border-radius: var(--radius-lg); border: 1px solid var(--border-light); overflow: hidden; display: flex; flex-direction: column; position: relative; z-index: 1; }
.empty-view { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); font-size: 20px; opacity: 0.3; }

.search-panel { border-bottom: 1px solid var(--border-light); background: inherit; position: sticky; top: 0; z-index: 5; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.search-input { width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--border-light); background: var(--content-bg); color: var(--text-primary); font-family: inherit; font-size: 13px; box-sizing: border-box; }
.search-input:focus { outline: 2px solid var(--accent-color); border-color: transparent; }
.search-options { display: flex; justify-content: space-between; align-items: center; gap: 5px; }
.toggle-row { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; color: var(--text-secondary); user-select: none; flex: 1; }
.search-status { padding: 10px; text-align: center; font-size: 12px; color: var(--accent-color); font-weight: bold; }
.tree-content { padding: 8px 0; }
.empty-state { padding: 20px; color: var(--text-secondary); font-size: 13px; text-align: center; }

/* Toggle Switch */
.toggle-switch { position: relative; display: inline-block; width: 34px; height: 20px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .4s; border-radius: 20px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: var(--accent-color); }
input:checked + .slider:before { transform: translateX(14px); }
.small-switch { width: 28px; height: 16px; }
.small-switch .slider:before { height: 12px; width: 12px; left: 2px; bottom: 2px; }
.small-switch input:checked + .slider:before { transform: translateX(12px); }

/* Settings and Modals */
.modal-overlay { 
  position: fixed; inset: 0; 
  background: rgba(0,0,0,0.7); backdrop-filter: blur(3px); 
  display: flex; align-items: center; justify-content: center; 
  z-index: 999999;
}

.settings-modal { 
  background: var(--content-bg); border: 1px solid var(--border-light); 
  border-radius: var(--radius-lg); width: 350px; 
  box-shadow: 0 10px 40px rgba(0,0,0,0.5); display: flex; flex-direction: column; overflow: hidden; 
}
.settings-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: var(--sidebar-bg); border-bottom: 1px solid var(--border-light); }
.settings-header h3 { margin: 0; font-size: 16px; color: var(--text-primary); }
.close-btn { font-size: 14px; padding: 4px 8px; background: transparent; border: none; color: var(--text-primary); cursor: pointer; border-radius: var(--radius-sm); }
.close-btn:hover { background: var(--item-hover); }
.settings-body { padding: 20px; display: flex; flex-direction: column; gap: 20px; }
.setting-item { display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: var(--text-primary); }
.cursor-pointer { cursor: pointer; user-select: none; }
.btn-secondary { background: var(--sidebar-bg); color: var(--text-primary); border: 1px solid var(--border-light); padding: 6px 12px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; transition: 0.2s;}
.btn-secondary:hover { background: var(--item-hover); }

/* Console */
.console-logs { font-family: 'Consolas', monospace; font-size: 11px; max-height: 50vh; overflow-y: auto; padding: 10px; border-radius: 4px; background: #000; border: 1px solid #333;}
.log-entry { margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #333; word-wrap: break-word;}
.log-time { color: #888; margin-right: 8px; }
.log-log { color: #fff; }
.log-warn { color: #ffaa00; }
.log-error { color: #ff5555; font-weight: bold; }

/* Mini Confirm Overlay */
.mini-confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 2000000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.mini-confirm-card { background: var(--content-bg); padding: 25px; border-radius: 12px; border: 1px solid var(--accent-color); width: 320px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.6); }
.mini-confirm-card h4 { margin: 0 0 10px 0; color: var(--accent-color); }
.mini-confirm-card p { font-size: 14px; margin-bottom: 20px; word-break: break-word; color: var(--text-primary); }
.confirm-btns { display: flex; justify-content: center; gap: 12px; }
.btn-danger { background: #631a1a; color: #ff8585; border: 1px solid #ff5555; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s; }
.btn-danger:hover { background: #ff5555; color: white; }

/* Mobile */
.mobile-menu-btn { display: none; }
.sidebar-backdrop { display: none; }

@media (max-width: 768px) {
  .mobile-menu-btn { display: block; } 
  .mobile-hidden { display: none !important; }    
  .window-title { display: none; }      
  .main-area { padding: 0; }            
  .content-view { border-radius: 0; border: none; border-top: 1px solid var(--border-light); }
  .sidebar { position: absolute; top: 0; left: 0; height: 100%; width: 280px; max-width: 80vw; z-index: 100; transform: translateX(-100%); border-radius: 0; border-right: 1px solid var(--border-light); box-shadow: 2px 0 10px rgba(0,0,0,0.2); }
  .sidebar.mobile-open { transform: translateX(0); }
  .sidebar-backdrop { display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 50; opacity: 0; pointer-events: none; transition: opacity 0.3s; backdrop-filter: blur(2px); }
  .sidebar-backdrop.show { opacity: 1; pointer-events: auto; }
}

::-webkit-scrollbar { width: 10px; height: 10px; background-color: transparent; }
::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 6px; }
::-webkit-scrollbar-thumb { background-color: var(--accent-color); border-radius: 6px; border: 2px solid transparent; background-clip: content-box; opacity: 0.8; }
::-webkit-scrollbar-thumb:hover { border: 1px solid transparent; background-color: var(--accent-color); opacity: 1; }
::-webkit-scrollbar-corner { background: transparent; }
</style>