// Catalogo de productos. Cada producto necesita una imagen en /public/images/.
// Para agregar un producto nuevo, agrega una imagen a public/images/ y un
// objeto aqui con un id unico, el nombre del archivo de imagen, el nombre
// que vera el cliente y una descripcion corta. "price" es opcional.
// "dozenPrice" (opcional) es el precio por docena (12 piezas): por cada 12
// piezas del mismo producto se cobra ese precio, y las que sobren a "price".
module.exports = [
  {
    id: 'esfera-arbol-navidad',
    image: 'esfera-arbol-navidad.webp',
    name: 'Esfera navideña - Árbol y regalos',
    description: 'Esfera decorativa con diseño de malla entrelazada, con un árbol de Navidad y regalos en su interior. Impresa en 3D en filamento blanco, incluye argolla para colgar.',
    price: 80,
    dozenPrice: 900, // precio por 12 piezas
  },
  {
    id: 'esfera-espiral-amarilla',
    image: 'esfera-espiral-amarilla.webp',
    name: 'Esfera navideña - Espiral',
    description: 'Esfera decorativa con diseño de relieve en espiral. Impresa en 3D, elige tu color.',
    price: 70,
    dozenPrice: 780, // precio por 12 piezas (se pueden combinar colores)
    // Opcional: si un producto tiene "colors", el cliente elige cuantas
    // quiere de cada color. Cada color usa su propia imagen. "note" es opcional
    // y aparece debajo del nombre del color (por ejemplo, si brilla en la oscuridad).
    colors: [
      { id: 'amarillo', name: 'Amarillo', hex: '#f2d43a', image: 'esfera-espiral-amarilla.webp' },
      { id: 'rojo', name: 'Rojo', hex: '#d62828', image: 'esfera-espiral-rojo.webp' },
      { id: 'rosa', name: 'Rosa', hex: '#e7a8e3', image: 'esfera-espiral-rosa.webp', note: 'Muy brillante (PLA especial)' },
      { id: 'verde', name: 'Verde', hex: '#2bb24c', image: 'esfera-espiral-verde.webp' },
      { id: 'azul', name: 'Azul', hex: '#2bb0e0', image: 'esfera-espiral-azul.webp', note: 'Brilla en la oscuridad' },
    ],
  },
];
