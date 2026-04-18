import { ref } from 'vue';

const itemsDatabase = ref({});
const isScanning = ref(false);

export function useGameDatabase() {

  const clearDatabase = () => {
    itemsDatabase.value = {};
  };

  /**
   * Registers an item in the database.
   * Returns modified JSON string if an auto-fix was applied, otherwise null.
   */
  const registerItem = (jsonContent, fileName, fullPath = '', targetDb = null) => {
    try {
      const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
      let fileWasFixed = false;

      // Silent fix for $Afterburner missing Id
      if (data.Name === '$Afterburner' && data.ItemType === 1 && !Object.prototype.hasOwnProperty.call(data, 'Id')) {
        const rebuiltData = {};
        if (data.ItemType !== undefined) rebuiltData.ItemType = data.ItemType;
        rebuiltData.Id = 0;
        
        for (const key in data) {
          if (key !== 'ItemType' && key !== 'Id') {
            rebuiltData[key] = data[key];
          }
        }
        
        for (const key in data) delete data[key];
        Object.assign(data, rebuiltData);
        fileWasFixed = true;
      }

      const id = data.Id ?? data.id;
      const type = data.ItemType ?? data.itemType;

      if (id !== undefined && type !== undefined) {
        const db = targetDb || itemsDatabase.value;

        if (!db[type]) {
          db[type] = [];
        }

        const displayPath = fullPath || fileName;

        db[type].push({
          id: Number(id),
          name: data.Name || fileName.replace('.json', ''),
          filePath: displayPath,
          data: data
        });
      }

      if (fileWasFixed) {
        return JSON.stringify(data, null, 2);
      }
      return null;

    } catch (e) {
      return null;
    }
  };

  const scanFiles = async (rootDirHandle) => {
    if (!rootDirHandle) return;
    isScanning.value = true;
    
    const newDb = {}; 

    const traverse = async (dirHandle, pathPrefix) => {
      for await (const entry of dirHandle.values()) {
        const entryPath = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;

        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          try {
            const file = await entry.getFile();
            const text = await file.text();
            
            registerItem(text, entry.name, entryPath, newDb);
            
          } catch (e) {
             console.warn(`Error reading ${entry.name}`, e);
          }
        } else if (entry.kind === 'directory') {
          await traverse(entry, entryPath);
        }
      }
    };

    try {
      await traverse(rootDirHandle, rootDirHandle.name);
      
      for (const key in newDb) {
        newDb[key].sort((a, b) => a.id - b.id);
      }
      
      itemsDatabase.value = newDb;
      
      console.log('Scan complete.');
      printStats();
    } catch (err) {
      console.error(err);
    } finally {
      isScanning.value = false;
    }
  };

  const getItemsByType = (typeId) => {
    return itemsDatabase.value[Number(typeId)] || [];
  };

  const printStats = () => {
    console.log('=== Statistics ===');
    let total = 0;
    for (const [type, list] of Object.entries(itemsDatabase.value)) {
      total += list.length;
    }
    console.log(`TOTAL: ${total} items.`);
  };

  return {
    itemsDatabase,
    isScanning,
    clearDatabase,
    registerItem,
    scanFiles,
    getItemsByType,
    printStats
  };
}