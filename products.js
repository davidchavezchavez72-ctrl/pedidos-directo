// Catalogo de productos. Cada producto necesita una imagen en /public/images/.
// Para agregar un producto nuevo, agrega una imagen a public/images/ y un
// objeto aqui con un id unico, el nombre del archivo de imagen, el nombre
// que vera el cliente y una descripcion corta. "price" es opcional.
module.exports = [
  {
    id: 'esfera-arbol-navidad',
    image: 'esfera-arbol-navidad.webp',
    name: 'Esfera navideña - Árbol y regalos',
    description: 'Esfera decorativa con diseño de malla entrelazada, con un árbol de Navidad y regalos en su interior. Impresa en 3D en filamento blanco, incluye argolla para colgar.',
    price: 80,
  },
  {
    id: 'esfera-espiral-amarilla',
    image: 'esfera-espiral-amarilla.webp',
    name: 'Esfera navideña - Espiral amarilla',
    description: 'Esfera decorativa con diseño de relieve en espiral. Impresa en 3D en filamento amarillo.',
    price: 80,
  },
];
