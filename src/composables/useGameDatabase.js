import { ref } from 'vue';

const itemsDatabase = ref({});
const isScanning = ref(false);

export function useGameDatabase() {

  const clearDatabase = () => {
    itemsDatabase.value = {};
  };

  /**
   * Registers an item in the database.
   * @param jsonContent - JSON string or object
   * @param fileName - file name (for logs and fallback)
   * @param fullPath - (Optional) full path to display in the UI
   * @param targetDb - (Optional) database object to write to (if not provided, writes to the global itemsDatabase)
   */
  const registerItem = (jsonContent, fileName, fullPath = '', targetDb = null) => {
    try {
      const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
      
      const id = data.Id ?? data.id;
      const type = data.ItemType ?? data.itemType;

      if (id !== undefined && type !== undefined) {
        // Determine where to write: to the temporary database (for speed) or the global one
        const db = targetDb || itemsDatabase.value;

        if (!db[type]) {
          db[type] = [];
        }

        // If fullPath is not provided, use at least the fileName
        const displayPath = fullPath || fileName;

        db[type].push({
          id: Number(id),
          name: data.Name || fileName.replace('.json', ''),
          filePath: displayPath, // Save the path
          data: data
        });
      }
    } catch (e) {
      // console.warn(`Error parsing item ${fileName}`, e);
    }
  };

  /**
   * Scans a folder and calls registerItem for each file, passing the path.
   */
  const scanFiles = async (rootDirHandle) => {
    if (!rootDirHandle) return;
    isScanning.value = true;
    
    // 1. Create a temporary database to avoid triggering Vue reactivity on every file
    const newDb = {}; 

    // 2. Recursive traversal
    const traverse = async (dirHandle, pathPrefix) => {
      for await (const entry of dirHandle.values()) {
        // Form the path: "Database/Quests/Quest.json"
        const entryPath = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;

        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          try {
            const file = await entry.getFile();
            const text = await file.text();
            
            // IMPORTANT: Call registerItem, passing newDb and entryPath
            registerItem(text, entry.name, entryPath, newDb);
            
          } catch (e) {
             console.warn(`Error reading ${entry.name}`, e);
          }
        } else if (entry.kind === 'directory') {
          // Go deeper
          await traverse(entry, entryPath);
        }
      }
    };

    try {
      // Start scanning with the root folder name
      await traverse(rootDirHandle, rootDirHandle.name);
      
      // Sort all lists by ID
      for (const key in newDb) {
        newDb[key].sort((a, b) => a.id - b.id);
      }
      
      // 3. Update the global state all at once
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