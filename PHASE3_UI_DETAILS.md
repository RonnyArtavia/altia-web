# Detalle Técnico: Rediseño UI (Fase 3)

## 1. Fundamentos Visuales (Tokens)
Se expandió `tailwind.config.ts` y `index.css` con:
- **Tipografía**: Google Fonts (Inter) optimizada.
- **Efectos**: Utilidades de `glass` y `glass-subtle` para efectos de transparencia.
- **Animaciones**: 
  - `shimmer`: Para estados de carga.
  - `stagger`: Para que los elementos de las listas aparezcan secuencialmente.
  - `float`: Efecto de flotado para elementos destacados.

## 2. Componentes Mejorados
- **Buttons**: Se añadió la variante `gradient` que usa los colores primarios de Altia con un efecto de brillo.
- **Cards**: Ahora tienen `card-lift`, una transición suave que eleva la tarjeta y profundiza la sombra al pasar el mouse.
- **Skeletons**: Implementados para evitar saltos visuales durante la carga de datos en el Dashboard y la lista de Pacientes.

## 3. Experiencia de Usuario (UX)
- **Header**: Se volvió "sticky" y detecta el scroll para aplicar una sombra sutil solo cuando el usuario se desplaza.
- **Sidebar**: Se rediseñó para ser más liviana (blanco semitraslúcido) y mejorar la navegación colapsable con Tooltips.

## 4. Estado del Debugging
Debido a reportes de pantalla en blanco, se está verificando:
1. El punto de entrada en `main.tsx`.
2. Posibles conflictos en la carga de fuentes globales o librerías de Radix.
