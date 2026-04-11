import { ref } from 'vue';
import { useFileSystem } from './useFileSystem';

const translations = ref({});
const isLoadingDicts = ref(false);

// Find all built-in XML files
const defaultLocales = import.meta.glob('/src/assets/localization/**/*.xml', { as: 'raw', eager: true });

export function useLocalization() {
  const { filesTree, readFileContent } = useFileSystem();
  const parser = new DOMParser();

  // === PARSING ===
  const parseAndStore = (fileName, xmlText) => {
    try {
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const items = [...xmlDoc.querySelectorAll('string, item')];
      let count = 0;

      for (const item of items) {
        let key = item.getAttribute('name');
        
        if (key) {
          if (!key.startsWith('$')) key = '$' + key;
          const value = item.textContent;
          
          if (!translations.value[key]) {
            translations.value[key] = [];
          }
          
          // Add translation to the list
          translations.value[key].push({
            file: fileName,
            text: value
          });
          count++;
        }
      }
      return count;
    } catch (e) {
      console.warn(`[Localization] Error: ${fileName}`, e);
      return 0;
    }
  };

  // === COLLECT USER FILES ===
  const collectUserXmlFiles = (nodes, list = []) => {
    for (const node of nodes) {
      if (node.kind === 'file' && node.name.toLowerCase().endsWith('.xml')) {
        list.push(node);
      } else if (node.kind === 'directory' && node.children) {
        collectUserXmlFiles(node.children, list);
      }
    }
    return list;
  };

  // === MAIN FUNCTION ===
  const loadAllDictionaries = async () => {
    isLoadingDicts.value = true;
    translations.value = {}; // Clear
    
    // 1. LOAD BUILT-IN FIRST (BASE)
    let defaultKeys = 0;
    for (const path in defaultLocales) {
      const shortName = path.split('/').pop(); 
      defaultKeys += parseAndStore(`[Base] ${shortName}`, defaultLocales[path]);
    }
    console.log(`[Localization] Base loaded: ${defaultKeys} keys.`);

    // 2. THEN LOAD USER FILES (OVERRIDE)
    if (filesTree.value && filesTree.value.length > 0) {
      const xmlFiles = collectUserXmlFiles(filesTree.value);
      
      if (xmlFiles.length > 0) {
        console.log(`[Localization] Mod files found: ${xmlFiles.length}`);
        let userKeys = 0;
        
        for (const fileNode of xmlFiles) {
          try {
            const text = await readFileContent(fileNode.handle);
            userKeys += parseAndStore(fileNode.name, text);
          } catch (e) {
            console.warn(`Error reading ${fileNode.name}`, e);
          }
        }
        console.log(`[Localization] Mod keys loaded: ${userKeys}`);
      }
    }
    
    isLoadingDicts.value = false;
  };

  const getTranslations = (key) => {
    if (!key || typeof key !== 'string') return [];
    const lookupKey = key.startsWith('$') ? key : '$' + key;
    return translations.value[lookupKey] || [];
  };

  return {
    translations,
    isLoadingDicts,
    loadAllDictionaries,
    getTranslations
  };
}