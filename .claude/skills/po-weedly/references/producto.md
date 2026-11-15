# Producto: Weedly

Última revisión: noviembre 2026. Si algo de acá ya no es cierto, avisale a Agus y proponé actualizarlo.

## Qué es
App mobile (Android e iPhone) de seguimiento de cultivo indoor. Hoy es de uso personal de Agus, pero la dirección es **convertirla en producto para otros growers**.

## Usuario hoy
Agus, un solo usuario. Cultivo: carpa de 80×80×160 cm, 6 macetas de 10 L en tierra (2 columnas, 3 filas), plantas fotoperiódicas feminizadas, germinadas el 30/07/2026 y en flora desde el 08/09. Luz LED, planea SCROG. Fertiliza con el Nutripack de Namasté (marca argentina, orgánico). Tiene iPhone y no tiene Mac, así que prueba con Expo Go y los builds de iOS pasan por EAS.

## Qué hace la versión actual (v0.1)
- Onboarding: armar la carpa, arrancar de cero o con plantas en curso. Tarjeta "Primeros pasos" (genética, plantar, primera lectura de clima, riego, foto).
- Plantado en macetas vacías (con cualquier genética o sin asignar) y descarte de plantas.
- Cierre de ciclo, ciclo nuevo e historial de ciclos anteriores.
- Cultivo en vista 3D isométrica o lista, con plantas renderizadas según su fase.
- Ficha de planta: fase y días calculados, barra vege/flora, descripción, riegos, fotos, genética, cata.
- Registro de riego a varias plantas: receta con ml según litros, pH, EC y runoff opcional, aviso cada N días.
- Fotos con descripción y etiquetas (poda, LST, plaga...), con opción de portada.
- Clima manual: temperatura, humedad y VPD calculado.
- Diario agrupado por día.
- Biblioteca: genéticas (flora en semanas con días calculados; THC/CBD; efectos y sabores con selección múltiple; tipo en pares Semilla Fem/Regular y Ciclo Foto/Auto), luminarias y fertilizantes (catálogo, sin recetas por ahora).
- Iluminación por ciclo con luminaria 3D, cromos de planta compartibles y diario por ciclo.

## Decisiones ya tomadas
- Nombre: **Weedly**.
- Diseño: oscuro y verde, con más animación 3D. Fuentes Fraunces (títulos) e Inter (cuerpo).
- Fotos reales de las plantas, siempre con descripción adjunta.
- Se arrancó de cero (no había web app previa) y se cargó el ciclo real de Agus como datos iniciales.
- Intención de **datos en la nube con sync** (Supabase: base y fotos en Storage) para backup y uso en otro dispositivo. Todavía no está hecho: hoy todo vive en el celular (AsyncStorage).
- Intención de **varias carpas con historial de ciclos**. El modelo de datos lo contempla pero la app todavía no lo expone (ver tensiones).
- Decisión original: un solo usuario, por simplicidad. Con el giro a "producto para otros growers", esto se reabre cuando haya cuentas.
- **Onboarding como ciclo completo** (noviembre 2026): armar carpa, cargar genéticas, plantar, cultivar, cerrar ciclo y empezar otro. Tiene dos entradas: "Arranco de cero" y "Ya tengo plantas".
- **Sin inventario de semillas** (noviembre 2026): se sacó el stock por genética que había antes. Plantar no descuenta nada ni bloquea genéticas. No sumar lógica de inventario salvo que Agus lo reabra.
- **Floración en semanas**: la genética se carga en semanas (como la publican los breeders) y se guarda en días (`floweringDays`), así los cálculos y los datos guardados no cambian. El formulario muestra los días como dato calculado, no editable.
- **Sustrato es texto libre** con atajos (`src/presets.ts`: Tierra, Coco, Turba y perlita, Living Soil). Ninguna lógica depende del valor.
- **Presets de carpa sin 120 × 60** (noviembre 2026): se sacó del onboarding; esa medida se arma con "Personalizada".
- **La planta ocupa maceta desde que germina.** No hay semillero aparte: germinar 8 para quedarse con las 6 mejores queda para más adelante.
- **Las plantas descartadas no se borran**: conservan su historial en el diario y liberan la maceta.
- **Cromos de planta para compartir** (noviembre 2026, en desarrollo): un cromo por planta, generable en cualquier momento desde la ficha, estética de carta coleccionable sobre fondo 9:16. Foto de portada (o render de la fase si no hay), genética, fase y días, cuenta regresiva a cosecha, THC/CBD, sabores/efectos; número `#n/total` del ciclo y marco con color por fase. Vista previa para cambiar foto y ocultar datos; se comparte por el menú del sistema (view-shot + expo-sharing). Fuera del MVP: Wrapped de cierre de ciclo, resumen de carpa, rarezas, botón directo a historias de Instagram. No nombrar Instagram en la app.
- **Colores de genéticas** (noviembre 2026): cada genética tiene un color fijo (`geneticPalette`) que aparece como punto o barra en Cultivo, Biblioteca y su formulario. Efectos y sabores se tiñen **por familia, no por valor** (`tagTones`: efectos lavanda, sabores turquesa), así lo que agrega el usuario también tiene color y no choca con los colores de genética. El tipo de semilla usa íconos, no colores. Colores semánticos por sabor quedan como opcional.
- **Ajustes sale de Biblioteca** (noviembre 2026): pantalla propia desde un engranaje en el encabezado, con tres bloques: Tu carpa (nombre, medidas, aviso de riego), Tus datos (exportar como archivo, importar copia, borrar todo) y Acerca de (versión, privacidad, aviso legal +18, contacto). No sumar interruptores de cosas que la app no soporta.
- **Lanzamiento** (noviembre 2026): v1 sin cuentas ni nube; todo en el celu, con exportar e importar como backup. Se publica primero como **beta cerrada** (TestFlight y prueba cerrada de Google Play, 5 a 10 growers) antes de producción. Orden: fotos persistentes e importar copia → Ajustes → ícono, splash, `eas.json` y versión de Expo fija → política de privacidad, clasificación +18 y fichas → beta.

## Tensiones y huecos conocidos (verificalos en el código antes de usarlos)
- **Multiusuario cambia todo el modelo de datos**: cuentas, datos por usuario, seguridad de acceso en Supabase, y qué pasa con los datos locales existentes.
- **Fotos como URIs locales** del selector: no son permanentes (en iOS pueden ser temporales) y son el principal riesgo al sincronizar. Bloqueante del lanzamiento: copiarlas a la carpeta de la app.
- **Una sola carpa por usuario en la app.** El store admite varias, pero falta la interfaz para crear otra y cambiar entre ellas.
- **Fases secado y curado existen en el tipo `Phase`**, pero no hay registro de cosecha (pesos, rendimiento) ni seguimiento de secado/curado.
- **Clima solo manual**; el campo `source` reserva el valor `sensor` pero no hay integración.
- **Solo español**, coma decimal, unidades métricas, y el único pack de fertilizantes es de una marca argentina. Para otros países hay que pensar localización y catálogo de fertilizantes.
- **Cannabis tiene un marco legal distinto por país y las tiendas de apps (App Store, Google Play) tienen políticas propias sobre apps de este rubro.** Antes de publicar para terceros hay que revisarlo. Es un riesgo de producto, no técnico.
- Sin tests ni lint: los cambios de dominio se validan a mano, y el estado guardado de Agus es valioso.

## Cómo priorizar
Criterios, en este orden: (1) no perder ni romper los datos reales de Agus, (2) habilitar lo que desbloquea otras ideas (por ejemplo, crear carpas/ciclos desbloquea onboarding y varias carpas), (3) valor diario para quien cultiva, (4) esfuerzo. Las animaciones y lo visual importan en este producto, pero no deberían ir por delante de que los datos estén a salvo.
