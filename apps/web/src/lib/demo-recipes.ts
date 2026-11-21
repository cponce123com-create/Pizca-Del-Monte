export const demoRecipes = [
  {
    slug: 'papa-huancaina-clasica', title: 'Papa a la huancaína', time: '35 minutos', servings: '4 porciones',
    description: 'Papas cocidas acompañadas de una salsa cremosa de ají amarillo y queso fresco.',
    image: '/demo/huancaina.webp',
    ingredients: ['4 papas medianas', '2 ajíes amarillos sin semillas ni venas', '200 g de queso fresco', '½ taza de leche evaporada', '4 galletas de soda', '1 cucharada de aceite', 'Sal al gusto', 'Lechuga, huevo cocido y aceitunas para servir'],
    steps: ['Lava y cocina las papas hasta que estén tiernas. Pela y corta en rodajas.', 'Cocina brevemente el ají y licúalo con el queso, la leche, las galletas y el aceite. Ajusta la textura con un poco más de leche si es necesario.', 'Prueba la salsa y añade sal al gusto. Sirve sobre las papas con lechuga, huevo y aceitunas.'],
    products: ['aji-amarillo-molido', 'aceite-oliva-extra-virgen', 'sal-rosada-de-maras'],
    tip: 'Si usas ají molido, agrégalo poco a poco y ajusta la intensidad al gusto.',
  },
  {
    slug: 'lomo-saltado-tradicional', title: 'Lomo saltado', time: '30 minutos', servings: '4 porciones',
    description: 'Carne salteada con cebolla, tomate y ají, acompañada de papas y arroz.',
    image: '/demo/lomo.webp',
    ingredients: ['600 g de carne de res en tiras', '1 cebolla roja en gajos', '2 tomates en gajos', '1 ají amarillo en tiras', '2 cucharadas de sillao', '1 cucharada de vinagre', '2 cucharadas de aceite', 'Sal y pimienta al gusto', 'Papas fritas y arroz cocido para acompañar'],
    steps: ['Sazona la carne con sal y pimienta. Calienta una sartén amplia con aceite y sella la carne por tandas.', 'Agrega la cebolla y el ají; saltea unos minutos. Incorpora el tomate, el sillao y el vinagre.', 'Cocina hasta que la carne esté cocida a tu preferencia y los vegetales estén tiernos pero firmes. Sirve con papas y arroz.'],
    products: ['pimienta-negra-entera', 'vinagre-de-manzana', 'aceite-oliva-extra-virgen'],
    tip: 'Evita llenar demasiado la sartén para que los ingredientes se salteen.',
  },
  {
    slug: 'ceviche-clasico', title: 'Ceviche peruano', time: '30 minutos', servings: '4 porciones',
    description: 'Pescado fresco con limón, cebolla y ají, servido con camote y choclo.',
    image: '/demo/ceviche.webp',
    ingredients: ['600 g de pescado apto para consumo crudo, en cubos', '8 limones aproximadamente', '1 cebolla roja en tiras finas', 'Ají al gusto', 'Culantro picado', 'Sal al gusto', 'Camote y choclo cocidos para acompañar'],
    steps: ['Mantén el pescado refrigerado y prepara la cebolla, el ají, el camote y el choclo.', 'Mezcla el pescado con sal, ají y jugo de limón. Incorpora cebolla y culantro.', 'Sirve inmediatamente acompañado de camote y choclo.'],
    products: ['sal-rosada-de-maras', 'aji-amarillo-molido'],
    tip: 'El limón no sustituye la cocción. Usa pescado destinado al consumo crudo, mantenido en frío; consulta a un profesional de salud si tienes dudas sobre consumirlo crudo.',
  },
] as const;
