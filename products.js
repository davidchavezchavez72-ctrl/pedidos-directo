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
    name: 'Esfera navideña - Espiral',
    description: 'Esfera decorativa con diseño de relieve en espiral. Impresa en 3D, elige tu color.',
    price: 70,
    // Opcional: si un producto tiene "colors", el cliente elige cuantas
    // quiere de cada color. Cada color usa su propia imagen.
    colors: [
      { id: 'amarillo', name: 'Amarillo', hex: '#f2d43a', image: 'esfera-espiral-amarilla.webp' },
      { id: 'rojo', name: 'Rojo', hex: '#d62828', image: 'esfera-espiral-rojo.webp' },
      { id: 'rosa', name: 'Rosa', hex: '#f08cc4', image: 'esfera-espiral-rosa.webp' },
      { id: 'verde', name: 'Verde', hex: '#2bb24c', image: 'esfera-espiral-verde.webp' },
      { id: 'azul', name: 'Azul', hex: '#2563c9', image: 'esfera-espiral-azul.webp' },
    ],
  },
];
