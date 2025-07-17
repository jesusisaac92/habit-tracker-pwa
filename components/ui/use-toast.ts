// Implementación temporal sin dependencias externas
export const toast = {
  title: (title: string, description?: string) => {
    console.log('Toast:', title, description);
    alert(`${title}${description ? '\n' + description : ''}`);
    return null;
  },
  description: (description: string) => {
    console.log('Toast description:', description);
    alert(description);
    return null;
  },
  error: (message: string) => {
    console.error('Toast error:', message);
    alert(`Error: ${message}`);
    return null;
  },
  success: (message: string) => {
    console.log('Toast success:', message);
    alert(`Success: ${message}`);
    return null;
  }
}; 