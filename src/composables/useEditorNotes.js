import { ref } from 'vue';

// Global notes store (to avoid reading the file every second)
const notesCache = ref({});
let rootDirectoryHandle = null;

export function useEditorNotes() {
  
  // Initialization (called once when selecting the database folder)
  const initNotes = async (dirHandle) => {
    rootDirectoryHandle = dirHandle;
    try {
      const fileHandle = await dirHandle.getFileHandle('EditorNotes.xml');
      const file = await fileHandle.getFile();
      const text = await file.text();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const noteNodes = xmlDoc.getElementsByTagName("Note");

      const newCache = {};
      for (let i = 0; i < noteNodes.length; i++) {
        const node = noteNodes[i];
        const type = node.getAttribute("ItemType");
        const id = node.getAttribute("Id");
        newCache[`${type}_${id}`] = node.textContent;
      }
      notesCache.value = newCache;
    } catch (e) {
      // If the EditorNotes.xml file doesn't exist in the folder yet, just create an empty cache
      notesCache.value = {};
    }
  };

  // Get a note
  const getNote = (itemType, id) => {
    if (itemType === undefined || id === undefined) return '';
    return notesCache.value[`${itemType}_${id}`] || '';
  };

  // Save a note (writes immediately to the XML file)
  const saveNote = async (itemType, id, text) => {
    if (!rootDirectoryHandle || itemType === undefined || id === undefined) return;
    const key = `${itemType}_${id}`;

    if (!text || text.trim() === '') {
      delete notesCache.value[key]; // Delete if the text was cleared
    } else {
      notesCache.value[key] = text;
    }

    // Rebuild the XML
    let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n<EditorNotes>\n';
    for (const [k, val] of Object.entries(notesCache.value)) {
      const [t, i] = k.split('_');
      // Protect against special characters in XML
      const escapedVal = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      xmlString += `  <Note ItemType="${t}" Id="${i}">${escapedVal}</Note>\n`;
    }
    xmlString += '</EditorNotes>';

    // Overwrite the file
    try {
      const fileHandle = await rootDirectoryHandle.getFileHandle('EditorNotes.xml', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(xmlString);
      await writable.close();
    } catch (e) {
      console.error("Error saving EditorNotes.xml", e);
    }
  };

  return { initNotes, getNote, saveNote, notesCache };
}