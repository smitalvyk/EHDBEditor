<script setup>
import { ref, shallowRef, computed, onMounted, watch } from 'vue';

// COMPOSABLES
import { useFileSystem } from './composables/useFileSystem';
import { useGameDatabase } from './composables/useGameDatabase';
import { useLocalization } from './composables/useLocalization'; 
import { useEditorNotes } from './composables/useEditorNotes'; 
import { useValidator } from './composables/useValidator';
import { useProjectDB } from './composables/useProjectDB';
import { useDevConsole } from './composables/useDevConsole';

// UTILS
import { getMimeType, sortTreeNodes, countFiles } from './utils/fileHelpers';

// COMPONENTS
import FileTreeItem from './components/FileTreeItem.vue';
import FilePreview from './components/FilePreview.vue';
import EditorModal from './components/EditorModal.vue';
import VisualEditorModal from './components/VisualEditorModal.vue';
import XmlLocalizationEditor from './components/XmlLocalizationEditor.vue';

// LIBRARIES
import JSZip from 'jszip';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

// --- INIT COMPOSABLES ---
const { 
  isNative, availableProjects, loadProjectsList, createNewProject, openNativeProject,
  openDirectory, filesTree, rootHandle, selectedFile, selectedContent, fileType, 
  selectFile, readFileContent, saveFileContent, deleteFile, moveFile, copyFile 
} = useFileSystem();

const { clearDatabase, registerItem, printStats } = useGameDatabase();
const { loadAllDictionaries, isLoadingDicts } = useLocalization();
const { initNotes } = useEditorNotes(); 
const { runChecks } = useValidator();
const { clearProjectDB, saveToProjectDB, updateSingleFileInDB, getFileFromDB, getAllFilesFromDB } = useProjectDB();
const { isConsoleOpen, appLogs, startLongPressTimer, cancelLongPress, setupConsoleInterceptor } = useDevConsole();

// --- STATE ---
const isEditorOpen = ref(false);
const isVisualOpen = ref(false);
const isScanning = ref(false);
const isSidebarOpen = ref(false); 
const isProjectModalOpen = ref(false);
const newProjectName = ref('');

// === ZIP STATE ===
const isZipMode = ref(false);
const currentZipArchive = shallowRef(null);
const zipFileInput = ref(null);

// === SCANNING PROGRESS ===
const scanProgress = ref(0);
const totalFilesToScan = ref(0);
const filesScanned = ref(0);

// === SETTINGS & VALIDATION ===
const isSettingsOpen = ref(false);
const isValidatorOpen = ref(false); 
const isValidatorLoading = ref(false); 
const validationErrors = shallowRef([]);  
const displayLimit = ref(50); 

const showErrorsFilter = ref(true);
const showWarningsFilter = ref(true);
const selectedTypeFilter = ref('All');

const confirmAction = ref({ show: false, title: '', message: '', action: null });

const totalErrorsCount = computed(() => validationErrors.value.filter(e => e.message.includes('❌')).length);
const totalWarningsCount = computed(() => validationErrors.value.filter(e => e.message.includes('⚠️')).length);


// DEV CONSOLE BINDING
const startLongPress = () => startLongPressTimer(() => { isSettingsOpen.value = false; });

// TYPE MAP
const typeMap = {
  0: "Undefined", 1: "Component", 2: "Device", 3: "Weapon",
  4: "AmmunitionObsolete", 5: "DroneBay", 6: "Ship", 7: "Satellite",
  8: "ShipBuild", 9: "SatelliteBuild", 10: "Technology",
  11: "ComponentStats", 12: "ComponentMod", 13: "Skill",
  14: "Faction", 15: "Quest", 16: "Loot", 18: "Fleet",
  19: "Character", 20: "QuestItem", 25: "Ammunition",
  26: "VisualEffect", 27: "BulletPrefab", 28: "BehaviorTree",
  29: "GameObjectPrefab", 30: "CombatRules", 31: "ComponentStatUpgrade",
  32: "StatUpgradeTemplate", 33: "FrontierLevel", 34: "FrontierCommonLevel",
  35: "ComponentGroupTag",
  100: "ShipSettings", 101: "GalaxySettings", 102: "DatabaseSettings",
  103: "ExplorationSettings", 104: "FrontierSettings", 105: "ShipModSettings",
  106: "SpecialEventSettings", 107: "SkillSettings", 108: "DebugSettings",
  109: "CombatSettings", 110: "UiSettings", 111: "FactionsSettings",
  112: "MusicPlaylist", 113: "ResearchSetting", 114: "PvpSettings",
  115: "FrontierNpcSettings", 116: "FrontierLevelSettings",
  117: "LocalizationSettings", 118: "WeaponSlots"
};
const getTypeName = (id) => typeMap[id] || `Unknown (${id})`;

const availableErrorTypes = computed(() => {
  const types = new Set();
  validationErrors.value.forEach(err => {
    if (err.itemType !== undefined) types.add(err.itemType);
  });
  const list = Array.from(types).map(id => ({ value: id, label: getTypeName(id) }));
  list.sort((a, b) => a.label.localeCompare(b.label));
  return [{ value: 'All', label: 'All' }, ...list];
});


const filteredValidationErrors = computed(() => {
  return validationErrors.value.filter(err => {
    const isWarning = err.message.includes('⚠️');
    const isError = err.message.includes('❌');
    if (isWarning && !showWarningsFilter.value) return false;
    if (isError && !showErrorsFilter.value) return false;
    if (selectedTypeFilter.value !== 'All' && String(err.itemType) !== String(selectedTypeFilter.value)) return false;
    return true;
  });
});

const uniqueFilesCount = computed(() => {
  const uniquePaths = new Set();
  filteredValidationErrors.value.forEach(err => uniquePaths.add(err.path));
  return uniquePaths.size;
});

const displayedErrors = computed(() => {
  return filteredValidationErrors.value.slice(0, displayLimit.value);
});

const loadMoreErrors = () => { displayLimit.value += 50; };
const openValidatorWindow = () => { isValidatorOpen.value = true; };
// Validation Settings
const validatorSettings = ref({
  checkMissingRefs: true,
  checkClamps: true,
  checkAiLogic: true
});
const handleRunScanner = () => {
  isValidatorLoading.value = true;
  displayLimit.value = 50; 
  setTimeout(() => {
    validationErrors.value = runChecks(validatorSettings.value); // Pass settings here
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
  const node = findNodeByPath(filesTree.value, err.path);
  if (node) {
    handleSelectFile(node);
    isValidatorOpen.value = false;
    setTimeout(() => { isVisualOpen.value = true; }, 150);
  }
};

const getUniqueNodesFromErrors = () => {
  const uniquePaths = new Set();
  const uniqueNodes = [];
  for (const err of filteredValidationErrors.value) {
    if (!uniquePaths.has(err.path)) {
      uniquePaths.add(err.path);
      const node = findNodeByPath(filesTree.value, err.path);
      if (node) uniqueNodes.push({ node, itemType: getTypeName(err.itemType) });
    }
  }
  return uniqueNodes;
};

const askConfirmation = (title, message, action) => { confirmAction.value = { show: true, title, message, action }; };
const executeConfirmedAction = async () => {
  const actionToRun = confirmAction.value.action;
  confirmAction.value.show = false;
  if (actionToRun) {
    await actionToRun();
    handleRunScanner();
  }
};

const deleteAllCorrupted = async () => {
  const targetNodes = getUniqueNodesFromErrors();
  let count = 0;
  for (const { node } of targetNodes) if (await deleteFile(node.handle)) count++;
  alert(`Deleted unique files: ${count}. Please re-open the folder to update the file tree!`);
};
const moveAllCorrupted = async (folderName) => {
  const targetNodes = getUniqueNodesFromErrors();
  let count = 0;
  for (const { node, itemType } of targetNodes) if (await moveFile(node.handle, folderName, itemType || 'Unknown')) count++;
  alert(`Moved unique files: ${count} to folder ${folderName}`);
};
const copyAllCorrupted = async (folderName) => {
  const targetNodes = getUniqueNodesFromErrors();
  let count = 0;
  for (const { node, itemType } of targetNodes) if (await copyFile(node.handle, folderName, itemType || 'Unknown')) count++;
  alert(`Copied unique files: ${count} to folder ${folderName}`);
};

const deleteSingle = async (err) => {
  const node = findNodeByPath(filesTree.value, err.path);
  if (node && await deleteFile(node.handle)) alert("File successfully deleted!");
};
const moveSingle = async (err, folderName) => {
  const node = findNodeByPath(filesTree.value, err.path);
  if (node && await moveFile(node.handle, folderName, getTypeName(err.itemType))) alert("File successfully moved!");
};
const copySingle = async (err, folderName) => {
  const node = findNodeByPath(filesTree.value, err.path);
  if (node && await copyFile(node.handle, folderName, getTypeName(err.itemType))) alert("File successfully copied!");
};

// --- SETTINGS STORAGE ---
const isDark = ref(localStorage.getItem('theme') !== 'light');
const showEditorNotes = ref(localStorage.getItem('showEditorNotes') !== 'false');
const sortJsonOnSave = ref(localStorage.getItem('sortJsonOnSave') !== 'false');

watch(isDark, (val) => { localStorage.setItem('theme', val ? 'dark' : 'light'); updateThemeClass(); });
watch(showEditorNotes, (val) => { localStorage.setItem('showEditorNotes', val); });
watch(sortJsonOnSave, (val) => { localStorage.setItem('sortJsonOnSave', val); });

// --- SEARCH STATE ---
const searchQuery = ref('');
const isContentSearch = ref(false); 
const isSearching = ref(false);     
const filteredFilesTree = ref([]);  
let searchTimeout = null;

// ==========================================
// ZIP FILE LOADING LOGIC
// ==========================================
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

// ==========================================
// DIRECTORY LOADING LOGIC (PC)
// ==========================================
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
           registerItem(text, node.name, currentPath);
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

// Media RAM cleaner
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

// ==========================================
// APP BOOTSTRAP (RELOAD CACHE)
// ==========================================
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

// ==========================================
// SEARCH
// ==========================================
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

        <button @click="openValidatorWindow" class="btn-icon" title="Diagnostics">🩺</button>
        
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
            <button class="close-sidebar-btn" @click="isSidebarOpen = false">Close</button>
          </div>
        </div>

        <div v-if="isSearching" class="search-status">⏳ Searching...</div>
        <div v-else-if="filteredFilesTree.length" class="tree-content">
          <FileTreeItem v-for="item in filteredFilesTree" :key="item.name" :item="item" @select="handleSelectFile" />
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

      <div v-if="isValidatorOpen" class="modal-overlay" @click.self="isValidatorOpen = false">
        <div class="settings-modal validator-modal large-modal">
          <div class="settings-header">
            <div class="header-left">
              <h3>🩺 Diagnostics</h3>
              <button @click="handleRunScanner" class="btn-scan-main" :disabled="isValidatorLoading">
                 {{ isValidatorLoading ? '⏳ Analyzing...' : '🔄 Run Scan' }}
              </button>
            </div>
            <button @click="isValidatorOpen = false" class="btn-icon close-btn">✖</button>
          </div>
          
          <div class="validator-scan-settings" style="display: flex; gap: 20px; font-size: 12px; padding: 12px 20px; background: rgba(0,0,0,0.1); border-bottom: 1px solid var(--border-light); align-items: center; flex-wrap: wrap;">
            <span style="color: var(--accent-color); font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Rules:</span>
            <label class="cursor-pointer" style="display: flex; gap: 6px; align-items: center;">
              <input type="checkbox" v-model="validatorSettings.checkMissingRefs">
              Check Missing IDs
            </label>
            <label class="cursor-pointer" style="display: flex; gap: 6px; align-items: center;">
              <input type="checkbox" v-model="validatorSettings.checkClamps">
              Check Limits (Clamp)
            </label>
            <label class="cursor-pointer" style="display: flex; gap: 6px; align-items: center;">
              <input type="checkbox" v-model="validatorSettings.checkAiLogic">
              Check AI Trees
            </label>
          </div>

          <div class="settings-body" v-if="isValidatorLoading">
             <div class="loading-state">
                <div class="spinner"></div>
                <span>Scanning database, please wait...</span>
             </div>
          </div>

          <div class="settings-body" v-else>
            <div v-if="validationErrors.length === 0" class="empty-msg">
              No diagnostic data. Select rules above and click "Run Scan" to start analysis.
            </div>

            <div v-else class="validator-content">
              <div class="validator-controls">
                <div class="validator-filters">
                   <label class="filter-toggle cursor-pointer">
                     <div class="toggle-switch small-switch">
                       <input type="checkbox" v-model="showErrorsFilter">
                       <span class="slider error-slider"></span>
                     </div>
                     <span class="filter-label error-text">Errors ({{ totalErrorsCount }})</span>
                   </label>
                   <label class="filter-toggle cursor-pointer">
                     <div class="toggle-switch small-switch">
                       <input type="checkbox" v-model="showWarningsFilter">
                       <span class="slider warning-slider"></span>
                     </div>
                     <span class="filter-label warning-text">Warnings ({{ totalWarningsCount }})</span>
                   </label>
                </div>

                <div class="type-filter-box">
                   <label>Filter by Type:</label>
                   <select v-model="selectedTypeFilter" class="win-input type-select">
                      <option v-for="t in availableErrorTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
                   </select>
                </div>
              </div>

              <div class="bulk-actions" v-if="filteredValidationErrors.length > 0">
                <button class="btn-danger" @click="askConfirmation('Delete visible?', `Are you sure you want to DELETE ${uniqueFilesCount} unique files?`, deleteAllCorrupted)">🗑️ Delete Visible</button>
                <button class="btn-secondary" @click="askConfirmation('Move visible?', `Move ${uniqueFilesCount} unique files to _FIX_NEEDED?`, () => moveAllCorrupted('_FIX_NEEDED'))">📁 Move Visible</button>
                <button class="btn-secondary" @click="askConfirmation('Copy visible?', `Copy ${uniqueFilesCount} unique files to _BACKUP?`, () => copyAllCorrupted('_BACKUP'))">📄 Copy Visible</button>
              </div>
              
              <div class="errors-list">
                <div class="errors-warning" v-if="filteredValidationErrors.length > 0">
                   Showing {{ displayedErrors.length }} of {{ filteredValidationErrors.length }} items
                </div>
                <div class="success-msg" v-else>
                   ✅ All filtered items are hidden or no errors found.
                </div>
                
                <div v-for="(err, i) in displayedErrors" :key="i" class="error-item" :class="{ 'is-warning': err.message.includes('⚠️') }">
                   <div class="err-header">
                     <span class="err-file">
                        File: {{ err.path }} <span class="err-meta">(ID: {{ err.itemId }} | Type: {{ getTypeName(err.itemType) }})</span>
                     </span>
                     <div class="err-quick-actions">
                        <button class="icon-btn-danger" @click="askConfirmation('Delete file?', `Delete ${err.path}?`, () => deleteSingle(err))" title="Delete">🗑️</button>
                        <button class="icon-btn-secondary" @click="askConfirmation('Move file?', `Move ${err.path} to _FIX_NEEDED?`, () => moveSingle(err, '_FIX_NEEDED'))" title="Move">📁</button>
                        <button class="icon-btn-secondary" @click="askConfirmation('Copy file?', `Copy ${err.path} to _BACKUP?`, () => copySingle(err, '_BACKUP'))" title="Copy">📄</button>
                        <button class="btn-err-edit" @click="openFileFromError(err)">✏️ EDIT</button>
                     </div>
                   </div>
                   <span class="err-msg">{{ err.message }}</span>
                </div>
                <button v-if="filteredValidationErrors.length > displayedErrors.length" @click="loadMoreErrors" class="btn-load-more">
                   Show More ({{ filteredValidationErrors.length - displayedErrors.length }} left)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="confirmAction.show" class="mini-confirm-overlay">
        <div class="mini-confirm-card">
          <h4>{{ confirmAction.title }}</h4>
          <p>{{ confirmAction.message }}</p>
          <div class="confirm-btns">
            <button class="btn-danger" @click="executeConfirmedAction">Yes, execute</button>
            <button class="btn-secondary" @click="confirmAction.show = false">Cancel</button>
          </div>
        </div>
      </div>

    </Teleport>

  </div>
</template>

<style>
/* === GLOBAL STYLES === */
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

/* ZIP Buttons Styling */
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
.search-options { display: flex; justify-content: space-between; align-items: center; }
.toggle-row { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; color: var(--text-secondary); user-select: none; }
.search-status { padding: 10px; text-align: center; font-size: 12px; color: var(--accent-color); font-weight: bold; }
.tree-content { padding: 8px 0; }
.empty-state { padding: 20px; color: var(--text-secondary); font-size: 13px; text-align: center; }

/* TOGGLE SWITCH */
.toggle-switch { position: relative; display: inline-block; width: 34px; height: 20px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .4s; border-radius: 20px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: var(--accent-color); }
input:checked + .slider:before { transform: translateX(14px); }
.small-switch { width: 28px; height: 16px; }
.small-switch .slider:before { height: 12px; width: 12px; left: 2px; bottom: 2px; }
.small-switch input:checked + .slider:before { transform: translateX(12px); }

input:checked + .error-slider { background-color: #ff5555 !important; }
input:checked + .warning-slider { background-color: #ffaa00 !important; }

/* === SETTINGS & MODALS === */
.modal-overlay { 
  position: fixed; inset: 0; 
  background: rgba(0,0,0,0.7); backdrop-filter: blur(3px); 
  display: flex; align-items: center; justify-content: center; 
  z-index: 999999; /* Window will now always be on top */
}

.settings-modal { 
  background: var(--content-bg); border: 1px solid var(--border-light); 
  border-radius: var(--radius-lg); width: 350px; 
  box-shadow: 0 10px 40px rgba(0,0,0,0.5); display: flex; flex-direction: column; overflow: hidden; 
}
.settings-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: var(--sidebar-bg); border-bottom: 1px solid var(--border-light); }
.settings-header h3 { margin: 0; font-size: 16px; color: var(--text-primary); }
.close-btn { font-size: 14px; padding: 4px 8px; }
.settings-body { padding: 20px; display: flex; flex-direction: column; gap: 20px; }
.setting-item { display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: var(--text-primary); }
.cursor-pointer { cursor: pointer; user-select: none; }
.btn-secondary { background: var(--sidebar-bg); color: var(--text-primary); border: 1px solid var(--border-light); padding: 6px 12px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; transition: 0.2s;}
.btn-secondary:hover { background: var(--item-hover); }

/* === CONSOLE === */
.console-logs { font-family: 'Consolas', monospace; font-size: 11px; max-height: 50vh; overflow-y: auto; padding: 10px; border-radius: 4px; background: #000; border: 1px solid #333;}
.log-entry { margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #333; word-wrap: break-word;}
.log-time { color: #888; margin-right: 8px; }
.log-log { color: #fff; }
.log-warn { color: #ffaa00; }
.log-error { color: #ff5555; font-weight: bold; }

/* === VALIDATOR === */
.large-modal { width: 800px; max-width: 95vw; }
.validator-modal { max-height: 85vh; }
.empty-msg { padding: 40px; text-align: center; color: var(--text-secondary); font-size: 14px; }
.success-msg { color: #44ff44; font-size: 14px; text-align: center; padding: 30px 10px; line-height: 1.5; }
.errors-warning { color: var(--text-secondary); font-weight: bold; font-size: 12px; margin-bottom: 10px; text-transform: uppercase;}
.errors-list { display: flex; flex-direction: column; gap: 10px; overflow-y: auto; max-height: 50vh; padding-right: 5px; }

.header-left { display: flex; align-items: center; gap: 15px; }
.btn-scan-main { background: var(--accent-color); color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px; transition: 0.2s; }
.btn-scan-main:hover { filter: brightness(1.2); }
.btn-scan-main:disabled { opacity: 0.5; cursor: wait; }

.validator-controls { display: flex; justify-content: space-between; gap: 20px; padding: 10px 15px; background: rgba(0,0,0,0.05); border-radius: 6px; margin-bottom: 15px; border: 1px solid var(--border-light); }
.validator-filters { display: flex; gap: 15px; }
.filter-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: bold; color: var(--text-primary); }
.error-text { color: #ff5555; }
.warning-text { color: #ffaa00; }
.type-filter-box { display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: bold; color: var(--text-primary); }
.type-select { padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-light); background: var(--content-bg); color: var(--text-primary); font-size: 12px; }

.error-item { padding: 12px; border-radius: 4px; display: flex; flex-direction: column; gap: 6px; border: 1px solid transparent; background: rgba(255, 85, 85, 0.08); border-left: 4px solid #ff5555; }
.error-item .err-file { color: #ff5555; font-size: 11px; font-family: monospace; font-weight: bold; flex: 1; }
.error-item.is-warning { background: rgba(255, 170, 0, 0.08); border-left: 4px solid #ffaa00; }
.error-item.is-warning .err-file { color: #ffaa00; }

.err-meta { color: var(--text-secondary); font-weight: normal; margin-left: 5px; opacity: 0.8; }
.err-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.err-msg { font-size: 13px; color: var(--text-primary); }

.err-quick-actions { display: flex; gap: 6px; align-items: center;}
.icon-btn-danger, .icon-btn-secondary { background: rgba(0,0,0,0.3); border: 1px solid var(--border-light); border-radius: 4px; padding: 4px; cursor: pointer; transition: 0.2s; font-size: 12px;}
.icon-btn-danger:hover { background: #ff5555; border-color: #ff5555; }
.icon-btn-secondary:hover { background: var(--accent-color); border-color: var(--accent-color); }
.btn-err-edit { background: rgba(85, 170, 255, 0.2); color: #60cdff; border: 1px solid #60cdff; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; transition: 0.2s; white-space: nowrap; font-weight: bold; }
.btn-err-edit:hover { background: #60cdff; color: #202020; }

.bulk-actions { display: flex; gap: 10px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid var(--border-light); }
.btn-danger { background: #631a1a; color: #ff8585; border: 1px solid #ff5555; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s; }
.btn-danger:hover { background: #ff5555; color: white; }

.btn-load-more { background: rgba(255,255,255,0.05); color: var(--text-primary); border: 1px dashed var(--border-light); padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; text-align: center; width: 100%; margin-top: 10px; }
.btn-load-more:hover { background: rgba(255,255,255,0.1); border-color: var(--accent-color); color: var(--accent-color); }

.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px; gap: 15px; color: var(--accent-color); font-weight: bold;}
.spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-left-color: var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* === MINI CONFIRM === */
.mini-confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 2000000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.mini-confirm-card { background: var(--content-bg); padding: 25px; border-radius: 12px; border: 1px solid var(--accent-color); width: 320px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.6); }
.mini-confirm-card h4 { margin: 0 0 10px 0; color: var(--accent-color); }
.mini-confirm-card p { font-size: 14px; margin-bottom: 20px; word-break: break-word;}
.confirm-btns { display: flex; justify-content: center; gap: 12px; }

/* MOBILE */
.mobile-menu-btn { display: none; }
.close-sidebar-btn { display: none; font-size: 11px; background: none; border: 1px solid var(--border-light); color: var(--text-secondary); padding: 2px 8px; border-radius: 4px; cursor: pointer; }
.sidebar-backdrop { display: none; }

@media (max-width: 768px) {
  .mobile-menu-btn { display: block; } 
  .mobile-hidden { display: none !important; }    
  .window-title { display: none; }      
  .main-area { padding: 0; }            
  .content-view { border-radius: 0; border: none; border-top: 1px solid var(--border-light); }
  .sidebar { position: absolute; top: 0; left: 0; height: 100%; width: 280px; max-width: 80vw; z-index: 100; transform: translateX(-100%); border-radius: 0; border-right: 1px solid var(--border-light); box-shadow: 2px 0 10px rgba(0,0,0,0.2); }
  .sidebar.mobile-open { transform: translateX(0); }
  .close-sidebar-btn { display: block; }
  .sidebar-backdrop { display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 50; opacity: 0; pointer-events: none; transition: opacity 0.3s; backdrop-filter: blur(2px); }
  .sidebar-backdrop.show { opacity: 1; pointer-events: auto; }
}

::-webkit-scrollbar { width: 10px; height: 10px; background-color: transparent; }
::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 6px; }
::-webkit-scrollbar-thumb { background-color: var(--accent-color); border-radius: 6px; border: 2px solid transparent; background-clip: content-box; opacity: 0.8; }
::-webkit-scrollbar-thumb:hover { border: 1px solid transparent; background-color: var(--accent-color); opacity: 1; }
::-webkit-scrollbar-corner { background: transparent; }
</style>