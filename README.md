# ATP Atentado — Guía de despliegue (v1.1)

## ¿Qué es esto?
Tu app ATP Atentado con Firebase (base de datos en la nube) y Vercel (hosting gratuito):
- Los datos se guardan en la nube (no se pierden al cerrar el navegador)
- Todos los jugadores ven los cambios en tiempo real (sincronización via Firestore)
- La app tiene su propia URL pública (ej: `atp-atentado.vercel.app`)

---

## 🆕 Novedades de esta versión (v1.1)

- **Sistema de puntos cronológico:** el motor de puntuación procesa los partidos en orden cronológico, calculando la equidad basándose en los puntos que cada jugador tenía **en el momento del partido**, no en los actuales. Esto hace que la clasificación sea reproducible y consistente.
- **Simulador de partido:** nueva pestaña que permite consultar cuántos puntos se obtendrían en un partido hipotético en una fecha concreta, teniendo en cuenta clasificación proyectada, equidad y límite de enfrentamientos.
- **Input de resultados visual (set-by-set):** nuevo componente que permite introducir los sets como celdas (6-3, 6-4, etc.) detectando automáticamente el ganador. Elección entre "al mejor de 3" o "al mejor de 5".
- **Reglas dinámicas:** las descripciones de las reglas se actualizan automáticamente con los valores actuales de config y muestran ejemplos calculados.
- **Bonus del admin:** el administrador puede otorgar puntos positivos a jugadores (no solo sancionar).
- **Brackets con jugadores editables:** el admin puede asignar/reasignar jugadores a cada cruce del cuadro de eliminación.
- **Torneos de eliminación directa:** ahora soportados con generación automática del cuadro según número de participantes (2, 4, 8 o 16).
- **Forma reciente:** indicador V/D de los últimos 5 partidos en la tabla de clasificación.
- **Filtros de partidos:** en la pestaña de Partidos puedes filtrar por tipo (Regular, Torneo, Amistoso, Reto) y superficie.
- **Clasificación en fecha exacta:** selecciona una fecha y verás cómo estaba la clasificación ese día.
- **Eliminación segura:** todos los borrados (torneos, reset total) piden confirmación.
- **Edición de perfil:** cada jugador puede editar su apodo, edad, mano, revés y cambiar su contraseña.
- **Head-to-Head mejorado:** muestra el marcador de cada partido en el historial H2H.

---

## PASO 1: Configurar Firebase

1. Ve a **https://console.firebase.google.com**
2. Tu proyecto `atp-atentado` ya debería existir (si no, créalo)
3. En el menú lateral izquierdo, haz clic en **"Firestore Database"**
4. Si aún no tienes base de datos: haz clic en **"Crear base de datos"**
5. Selecciona **"Iniciar en modo de prueba"** (esto permite que todos lean/escriban)
6. Elige la ubicación más cercana (ej: `europe-west1` para España)
7. Haz clic en **"Habilitar"**

✅ Firebase listo. (Si ya lo tenías de la versión anterior, no hace falta tocar nada.)

---

## PASO 2: Actualizar el código en GitHub

### Si es la primera vez (creando repositorio)

1. Ve a **https://github.com** y entra con tu cuenta
2. Haz clic en **"New repository"**
3. Nombre: `atp-atentado`, deja todo por defecto, **Create repository**
4. En la página del repositorio vacío, haz clic en **"uploading an existing file"**
5. Arrastra TODO el contenido del ZIP descomprimido
6. Haz clic en **"Commit changes"**

### Si ya tenías la v1.0 (actualización)

Tienes dos opciones:

**Opción A (más limpia): eliminar y rehacer el repo**
1. Ve a tu repositorio `atp-atentado` en GitHub
2. **Settings** → scroll al final → **Delete this repository**
3. Crea uno nuevo con el mismo nombre
4. Sube el ZIP nuevo tal y como en el paso anterior

**Opción B: sobrescribir archivos**
1. En tu repositorio existente, entra en cada archivo que haya cambiado
2. Haz clic en el icono de lápiz (editar) y pega el contenido nuevo
3. Commit changes

Archivos que han cambiado en esta versión:
- `package.json` (versión 1.1.0)
- `src/components/App.js` ← el grande
- `src/lib/logic.js` ← nueva función `computePointsAtDate`, `mCat`, `nRM`
- `src/lib/seed.js` (sin cambios funcionales, igual que v1.0)
- `src/lib/logo.js` ← **NUEVO**, logo SVG
- `README.md`

---

## PASO 3: Vercel se actualiza solo

Si ya tenías Vercel conectado al repositorio:
- Al hacer `commit` en GitHub, Vercel detecta el cambio y redespliega automáticamente en ~1-2 minutos
- La URL sigue siendo la misma (`atp-atentado.vercel.app`)

Si es la primera vez:
1. Ve a **https://vercel.com** y regístrate con GitHub
2. **Add New Project** → selecciona `atp-atentado`
3. Vercel detecta Next.js, no cambies nada → **Deploy**
4. Espera 1-2 minutos → ¡listo!

---

## PASO 4: Probar

1. Abre la URL de Vercel
2. Inicia sesión:
   - **Admin:** usuario `admin`, contraseña `admin123`
   - **Jugador:** cualquier apodo de demo (ej: `Carlitos`), contraseña `1234`
3. La primera vez, si Firestore estaba vacío, se cargan los datos de demo automáticamente
4. Cualquier partido que registres se guarda en la nube y aparece en el resto de dispositivos

---

## ⚠️ Nota sobre migración de datos

Si ya tenías la v1.0 funcionando con partidos reales registrados: **los datos están a salvo**. La estructura de Firestore es compatible entre v1.0 y v1.1. Al desplegar la v1.1:
- Si Firestore tiene datos → se usan esos datos existentes
- Si Firestore está vacío → se cargan los de demo

Si quieres empezar de cero limpio:
- Entra a Firebase Console → Firestore → elimina el documento `app_state/tennis-v11`
- O en la app (como admin) → Admin → botón **Reset** al final

---

## Estructura de archivos

```
atp-atentado/
├── package.json
├── next.config.mjs
├── vercel.json
├── firebase.json
├── firestore.rules
├── .gitignore
├── jsconfig.json
├── postcss.config.mjs
├── README.md
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.js
    │   └── page.js
    ├── lib/
    │   ├── firebase.js      ← conexión Firebase
    │   ├── firestore.js     ← load/save/subscribe
    │   ├── logic.js         ← lógica pura (puntos, clasificación, equidad)
    │   ├── seed.js          ← datos de demo
    │   └── logo.js          ← logo SVG
    └── components/
        └── App.js           ← interfaz completa
```

---

## Seguridad y costes

- **Seguridad:** Firestore está en modo abierto (cualquier usuario autenticado en Firebase puede leer/escribir). Para una liga amateur es suficiente; si quieres autenticación real, avísame.
- **Coste:** Firebase Spark (gratis) y Vercel Hobby (gratis) cubren sobradamente este tipo de uso. No te van a cobrar nada.
- **Dominio personalizado:** en Vercel → Settings → Domains puedes conectar un dominio propio.

Trigger redeploy with PWA files
