# Producto: Weedly

Última revisión: noviembre 2026. Si algo de acá ya no es cierto, avisale a Agus y proponé actualizarlo.

## Qué es
App mobile (Android e iPhone) de seguimiento de cultivo indoor. Hoy es de uso personal de Agus, pero la dirección es **convertirla en producto para otros growers**.

## Usuario hoy
Agus, un solo usuario. Cultivo: carpa de 80×80×160 cm, 6 macetas de 10 L en tierra (2 columnas, 3 filas), plantas fotoperiódicas feminizadas, germinadas el 30/07/2026 y en flora desde el 08/09. Luz LED, planea SCROG. Fertiliza con el Nutripack de Namasté (marca argentina, orgánico). Tiene iPhone y no tiene Mac, así que prueba con Expo Go y los builds de iOS pasan por EAS.

## Qué hace la versión actual (v0.1)
- Carpa en vista 3D isométrica o lista, con foto de portada sobre cada maceta.
- Ficha de planta: fase y días calculados, barra vege/flora, descripción, riegos, fotos, genética, cata.
- Registro de riego a varias plantas: receta con ml según litros, pH, EC y runoff opcional, aviso cada N días.
- Fotos con descripción y etiquetas (poda, LST, plaga...), con opción de portada.
- Clima manual: temperatura, humedad y VPD calculado.
- Diario agrupado por día.
- Biblioteca: genéticas, fertilizantes y recetas.

## Decisiones ya tomadas
- Nombre: **Weedly**.
- Diseño: oscuro y verde, con más animación 3D. Fuentes Fraunces (títulos) e Inter (cuerpo).
- Fotos reales de las plantas, siempre con descripción adjunta.
- Se arrancó de cero (no había web app previa) y se cargó el ciclo real de Agus como datos iniciales.
- Intención de **datos en la nube con sync** (Supabase: base y fotos en Storage) para backup y uso en otro dispositivo. Todavía no está hecho: hoy todo vive en el celular (AsyncStorage).
- Intención de **varias carpas con historial de ciclos**. El modelo de datos lo contempla pero la app todavía no lo expone (ver tensiones).
- Decisión original: un solo usuario, por simplicidad. Con el giro a "producto para otros growers", esto se reabre cuando haya cuentas.
- **Onboarding como ciclo completo** (noviembre 2026): armar carpa, cargar semillas, plantar, cultivar, cerrar ciclo y empezar otro. Tiene dos entradas: "Arranco de cero" y "Ya tengo plantas".
- **Semillas como cantidad por genética**, no como lotes. Si hace falta banco, fecha o precio por compra, se reabre.
- **La planta ocupa maceta desde que germina.** No hay semillero aparte: germinar 8 para quedarse con las 6 mejores queda para más adelante.
- **Las plantas descartadas no se borran**: conservan su historial en el diario y liberan la maceta.

## Tensiones y huecos conocidos (verificalos en el código antes de usarlos)
- **El seed es el ciclo de Agus.** Los datos iniciales del store son su carpa, sus macetas y sus fechas. Para otro grower hace falta onboarding (crear carpa, ciclo, macetas y plantas) y un estado vacío decente.
- **Multiusuario cambia todo el modelo de datos**: cuentas, datos por usuario, seguridad de acceso en Supabase, y qué pasa con los datos locales existentes.
- **Fotos como URIs locales** del selector: no son permanentes y son el principal riesgo al sincronizar.
- **Sin acciones en el store para crear/archivar carpas, ciclos, macetas o plantas.** Hoy solo se editan los precargados. Sin esto no hay "varias carpas" ni "historial de ciclos" ni onboarding.
- **Fases secado y curado existen en el tipo `Phase`**, pero no hay registro de cosecha (pesos, rendimiento) ni seguimiento de secado/curado.
- **Clima solo manual**; el campo `source` reserva el valor `sensor` pero no hay integración.
- **Solo español**, coma decimal, unidades métricas, fertilizantes precargados de una marca argentina. Para otros países hay que pensar localización y catálogo de fertilizantes.
- **Cannabis tiene un marco legal distinto por país y las tiendas de apps (App Store, Google Play) tienen políticas propias sobre apps de este rubro.** Antes de publicar para terceros hay que revisarlo. Es un riesgo de producto, no técnico.
- Sin tests ni lint: los cambios de dominio se validan a mano, y el estado guardado de Agus es valioso.

## Cómo priorizar
Criterios, en este orden: (1) no perder ni romper los datos reales de Agus, (2) habilitar lo que desbloquea otras ideas (por ejemplo, crear carpas/ciclos desbloquea onboarding y varias carpas), (3) valor diario para quien cultiva, (4) esfuerzo. Las animaciones y lo visual importan en este producto, pero no deberían ir por delante de que los datos estén a salvo.
