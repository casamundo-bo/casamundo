module.exports = {
  // ... otras configuraciones
  rules: {
    // ... otras reglas
    'react/no-unknown-property': ['error', { ignore: [] }],
    'react/jsx-pascal-case': 'error'  // Añadir esta regla para detectar propiedades en camelCase
  }
};